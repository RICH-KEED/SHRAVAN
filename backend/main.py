from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.orchestrator import Orchestrator
from core.environment import SCENARIOS
from benchmark.runner import run_benchmark, BenchmarkConfig


app = FastAPI(title="SHRAVAN API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator: Optional[Orchestrator] = None
ws_clients: list[WebSocket] = []
auto_run_task: Optional[asyncio.Task] = None


class SimConfig(BaseModel):
    scenario: str = "cold_start"
    num_bands: int = 10
    seed: int = 42
    dwell_duration: float = 0.5
    false_alarm_rate: float = 0.05
    scheduler_name: str = "shravan"
    scheduler_weights: Optional[dict] = None


class StepConfig(BaseModel):
    num_steps: int = 1


class BenchmarkRequest(BaseModel):
    scenario: str = "periodic"
    num_bands: int = 10
    seed: int = 42
    num_steps: int = 200
    dwell_duration: float = 0.5
    false_alarm_rate: float = 0.05


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SHRAVAN"}


@app.get("/api/scenarios")
async def scenarios():
    return {"scenarios": SCENARIOS}


@app.post("/api/sim/init")
async def init_sim(config: SimConfig):
    global orchestrator, auto_run_task
    if auto_run_task and not auto_run_task.done():
        auto_run_task.cancel()
        auto_run_task = None
    orchestrator = Orchestrator(
        scenario=config.scenario,
        num_bands=config.num_bands,
        seed=config.seed,
        dwell_duration=config.dwell_duration,
        false_alarm_rate=config.false_alarm_rate,
        scheduler_name=config.scheduler_name,
        scheduler_weights=config.scheduler_weights,
    )
    orchestrator.running = False
    return orchestrator.state()


@app.post("/api/sim/reset")
async def reset_sim(config: Optional[SimConfig] = None):
    global orchestrator, auto_run_task
    if auto_run_task and not auto_run_task.done():
        auto_run_task.cancel()
        auto_run_task = None
    if orchestrator is None:
        orchestrator = Orchestrator()
    if config:
        orchestrator.reset(
            scenario=config.scenario,
            scheduler_name=config.scheduler_name,
            scheduler_weights=config.scheduler_weights,
            seed=config.seed,
        )
    else:
        orchestrator.reset()
    orchestrator.running = False
    return orchestrator.state()


@app.post("/api/sim/step")
async def step_sim(step_config: StepConfig):
    global orchestrator
    if orchestrator is None:
        orchestrator = Orchestrator()
    results = []
    for _ in range(step_config.num_steps):
        results.append(orchestrator.step())
    return results[-1] if results else orchestrator.state()


@app.post("/api/sim/run")
async def run_sim(step_config: StepConfig):
    global orchestrator
    if orchestrator is None:
        orchestrator = Orchestrator()
    final_state = orchestrator.state()
    for _ in range(step_config.num_steps):
        final_state = orchestrator.step()
    return final_state


@app.get("/api/sim/state")
async def get_state():
    global orchestrator
    if orchestrator is None:
        orchestrator = Orchestrator()
    return orchestrator.state()


@app.post("/api/sim/start")
async def start_auto_run():
    global auto_run_task
    if orchestrator is None:
        return {"error": "Initialize simulation first."}
    orchestrator.running = True
    if auto_run_task and not auto_run_task.done():
        return {"status": "already_running"}
    auto_run_task = asyncio.create_task(_auto_run_loop())
    return {"status": "started"}


@app.post("/api/sim/stop")
async def stop_auto_run():
    global auto_run_task
    if orchestrator:
        orchestrator.running = False
    if auto_run_task and not auto_run_task.done():
        auto_run_task.cancel()
        auto_run_task = None
    return {"status": "stopped"}


async def _auto_run_loop():
    global orchestrator
    try:
        while orchestrator and orchestrator.running:
            orchestrator.step()
            state = orchestrator.state()
            await _broadcast(state)
            await asyncio.sleep(0.15)
    except asyncio.CancelledError:
        pass


@app.get("/api/inspector/technical")
async def technical_inspector():
    global orchestrator
    if orchestrator is None:
        orchestrator = Orchestrator()
    return orchestrator.inspector_state()


@app.get("/api/inspector/emitter")
async def emitter_inspector():
    global orchestrator
    if orchestrator is None:
        orchestrator = Orchestrator()
    return orchestrator.emitter_inspector()


@app.post("/api/benchmark")
async def benchmark(req: BenchmarkRequest):
    config = BenchmarkConfig(
        scenario=req.scenario,
        num_bands=req.num_bands,
        seed=req.seed,
        num_steps=req.num_steps,
        dwell_duration=req.dwell_duration,
        false_alarm_rate=req.false_alarm_rate,
    )
    return run_benchmark(config)


@app.websocket("/api/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    try:
        if orchestrator:
            await ws.send_text(json.dumps(orchestrator.state()))
        while True:
            data = await ws.receive_text()
            msg = json.loads(data) if data else {}
            if msg.get("action") == "step":
                if orchestrator:
                    orchestrator.step()
                    await ws.send_text(json.dumps(orchestrator.state()))
            elif msg.get("action") == "state":
                if orchestrator:
                    await ws.send_text(json.dumps(orchestrator.state()))
    except WebSocketDisconnect:
        ws_clients.remove(ws)


async def _broadcast(state: dict):
    dead = []
    for ws in ws_clients:
        try:
            await ws.send_text(json.dumps(state))
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_clients.remove(ws)


frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = frontend_dist / "index.html"
        target = frontend_dist / full_path
        if full_path and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(index))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
