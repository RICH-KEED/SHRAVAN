from __future__ import annotations

from dataclasses import dataclass

from core.orchestrator import Orchestrator


@dataclass
class BenchmarkConfig:
    scenario: str = "periodic"
    num_bands: int = 10
    seed: int = 42
    num_steps: int = 200
    dwell_duration: float = 0.5
    false_alarm_rate: float = 0.05


STRATEGIES = ["round_robin", "random", "greedy", "shravan"]


def run_single(strategy: str, config: BenchmarkConfig) -> dict:
    orch = Orchestrator(
        scenario=config.scenario,
        num_bands=config.num_bands,
        seed=config.seed,
        dwell_duration=config.dwell_duration,
        false_alarm_rate=config.false_alarm_rate,
        scheduler_name=strategy,
    )
    orch.run(config.num_steps)
    report = orch.metrics.report()
    report["strategy"] = strategy
    report["scenario"] = config.scenario
    report["seed"] = config.seed
    report["num_steps"] = config.num_steps
    return report


def run_benchmark(config: BenchmarkConfig) -> dict:
    results = []
    for strategy in STRATEGIES:
        report = run_single(strategy, config)
        results.append(report)

    summary = _summarize(results)
    return {
        "config": {
            "scenario": config.scenario,
            "num_bands": config.num_bands,
            "seed": config.seed,
            "num_steps": config.num_steps,
            "dwell_duration": config.dwell_duration,
            "false_alarm_rate": config.false_alarm_rate,
        },
        "strategies": STRATEGIES,
        "results": results,
        "summary": summary,
    }


def _summarize(results: list[dict]) -> dict:
    metrics_keys = [
        "probability_of_detection",
        "false_alarm_rate",
        "interception_rate",
        "average_intercept_time",
        "prediction_accuracy",
        "average_reward",
    ]
    summary = {}
    for key in metrics_keys:
        summary[key] = {
            r["strategy"]: r[key] for r in results
        }
    best = {}
    for key in metrics_keys:
        if key in ("false_alarm_rate", "average_intercept_time"):
            best_strategy = min(results, key=lambda r: r[key])["strategy"]
        else:
            best_strategy = max(results, key=lambda r: r[key])["strategy"]
        best[key] = best_strategy
    summary["best"] = best
    return summary
