from __future__ import annotations

from typing import Optional

from .environment import RFEnvironment
from .receiver import Receiver
from .detection import Detector
from .belief import BeliefEngine
from .prediction import PredictionEngine
from .scheduler import SmartScheduler, BaseScheduler, make_scheduler
from .metrics import Metrics


class Orchestrator:
    def __init__(self, scenario: str = "cold_start", num_bands: int = 10, seed: int = 42,
                 dwell_duration: float = 0.5, false_alarm_rate: float = 0.05,
                 scheduler_name: str = "shravan", scheduler_weights: Optional[dict] = None):
        self.scenario = scenario
        self.num_bands = num_bands
        self.seed = seed
        self.dwell_duration = dwell_duration

        self.env = RFEnvironment(scenario, num_bands, seed)
        self.receiver = Receiver(num_bands=num_bands, dwell_duration=dwell_duration)
        self.detector = Detector(false_alarm_rate=false_alarm_rate, seed=seed)
        self.belief = BeliefEngine(num_bands)
        self.prediction = PredictionEngine(num_bands)

        if scheduler_name == "shravan":
            w = scheduler_weights or {}
            self.scheduler = SmartScheduler(num_bands, seed, **w)
        else:
            self.scheduler = make_scheduler(scheduler_name, num_bands, seed)

        self.metrics = Metrics()
        self.events: list[dict] = []
        self.rf_map: list[dict] = []
        self._first_contact = False
        self._pattern_detected: set[int] = set()
        self._intercepted: set[str] = set()
        self._adaptation_logged = False
        self.running = False
        self.last_decision = None
        self._prev_emitter_active: dict[str, bool] = {}

    def reset(self, scenario: Optional[str] = None, scheduler_name: Optional[str] = None,
              scheduler_weights: Optional[dict] = None, seed: Optional[int] = None) -> None:
        if scenario is not None:
            self.scenario = scenario
        if seed is not None:
            self.seed = seed

        self.env = RFEnvironment(self.scenario, self.num_bands, self.seed)
        self.receiver.reset()
        self.detector.reset()
        self.belief.reset()
        self.prediction.reset()

        sname = scheduler_name or self.scheduler.name
        if sname == "shravan":
            w = scheduler_weights or {}
            self.scheduler = SmartScheduler(self.num_bands, self.seed, **w)
        else:
            self.scheduler = make_scheduler(sname, self.num_bands, self.seed)

        self.metrics = Metrics()
        self.events = []
        self.rf_map = []
        self._first_contact = False
        self._pattern_detected = set()
        self._intercepted = set()
        self._adaptation_logged = False
        self.running = False
        self.last_decision = None
        self._prev_emitter_active = {}

    def step(self) -> dict:
        t = self.env.time

        decision = self.scheduler.select(self.belief, self.prediction, t)
        band = decision.band
        self.last_decision = decision

        if isinstance(self.scheduler, SmartScheduler):
            self.scheduler.record_visit(band, t)

        self.receiver.tune(band)

        detection = self.detector.detect(self.env, band, t)
        observation = detection["observation"]
        ground_truth = detection["ground_truth"]
        confidence = detection["confidence"]

        self.receiver.observe(observation, confidence, detection["emitter_id"])

        pre_update_prediction = self.prediction.prediction(band)

        self.belief.update(band, observation, t)

        self.prediction.update_all(self.belief, t)
        self.prediction.apply_staleness_decay(t)
        self.belief.apply_time_decay(t)

        self.metrics.update(observation, ground_truth, t, self.dwell_duration)

        current_active = {e["id"] for e in self.env.active_emitters_at(t)}
        for eid in current_active:
            if not self._prev_emitter_active.get(eid, False):
                self.metrics.record_active_window(eid)
        self._prev_emitter_active = {eid: True for eid in current_active}

        if observation == "hit" and pre_update_prediction.has_prediction and ground_truth:
            predicted_t = pre_update_prediction.next_event_time
            if abs(predicted_t - t) <= pre_update_prediction.estimated_period * 0.5:
                self.metrics.evaluate_prediction(predicted_t, t)
            self.metrics.record_intercept_time(ground_truth, t, t - pre_update_prediction.estimated_period)

        self._check_events(band, observation, ground_truth, t)
        self._record_rf_map(band, observation, ground_truth, t)

        self.env.advance(self.dwell_duration)
        self.receiver.steps = self.receiver.steps

        return self.state()

    def _check_events(self, band: int, observation: str, ground_truth: Optional[str], t: float) -> None:
        if observation == "hit" and not self._first_contact:
            self._first_contact = True
            self.events.append({
                "time": round(t, 2), "type": "first_contact",
                "band": band, "emitter": ground_truth,
                "message": f"First contact: emitter {ground_truth} detected in band #{band}.",
            })

        bb = self.belief.band_belief(band)
        if band not in self._pattern_detected and bb.estimated_period > 0 and bb.period_confidence > 0.5:
            self._pattern_detected.add(band)
            self.events.append({
                "time": round(t, 2), "type": "pattern_detection",
                "band": band, "message": f"Pattern detected in band #{band}: period ~{bb.estimated_period:.1f}s (confidence {bb.period_confidence:.2f}).",
            })

        if observation == "hit" and ground_truth and ground_truth not in self._intercepted:
            self._intercepted.add(ground_truth)
            self.events.append({
                "time": round(t, 2), "type": "interception",
                "band": band, "emitter": ground_truth,
                "message": f"Interception: emitter {ground_truth} intercepted in band #{band}.",
            })

        for i in range(self.num_bands):
            pred = self.prediction.prediction(i)
            if (pred.has_prediction and pred.confidence < 0.1
                    and i in self._pattern_detected and not self._adaptation_logged):
                self._adaptation_logged = True
                self.events.append({
                    "time": round(t, 2), "type": "adaptation",
                    "band": i, "message": f"Adaptation: prediction for band #{i} became stale, switching to exploration.",
                })

    def _record_rf_map(self, band: int, observation: str, ground_truth: Optional[str], t: float) -> None:
        active_bands = {e["band"] for e in self.env.active_emitters_at(t)}
        self.rf_map.append({
            "time": round(t, 2),
            "observed_band": band,
            "observation": observation,
            "active_bands": sorted(active_bands),
            "hit": observation == "hit",
        })

    def run(self, num_steps: int) -> list[dict]:
        results = []
        for _ in range(num_steps):
            results.append(self.step())
        return results

    def state(self) -> dict:
        t = self.env.time
        return {
            "running": self.running,
            "scenario": self.scenario,
            "mission_time": round(t, 2),
            "step": self.receiver.steps,
            "receiver": self.receiver.state(self.env),
            "scheduler": {
                "name": self.scheduler.name,
                "decision": self._last_decision(),
            },
            "belief": self.belief.state(),
            "belief_summary": self.belief.summary(),
            "prediction": self.prediction.state(),
            "metrics": self.metrics.report(),
            "events": self.events[-20:],
            "rf_map": self.rf_map[-100:],
            "scheduler_state": self.scheduler.state() if hasattr(self.scheduler, "state") else {},
            "emitter_metadata": self.env.emitter_metadata(),
            "ground_truth_active": self.env.active_emitters_at(t),
            "future_events": self.env.future_emitter_events(t, horizon=30.0),
            "num_bands": self.num_bands,
        }

    def _last_decision(self) -> dict:
        if self.last_decision is None:
            band = self.scheduler.last_band if self.scheduler.last_band >= 0 else 0
            return {"band": band, "scores": {}, "reason": "Pending first decision."}
        return self.last_decision.to_dict()

    def inspector_state(self) -> dict:
        return {
            "receiver": self.receiver.state(self.env),
            "detection": {
                "false_alarm_rate": self.detector.false_alarm_rate,
            },
            "scheduler_weights": self.scheduler.state() if hasattr(self.scheduler, "state") else {},
            "belief": self.belief.state(),
            "prediction": self.prediction.state(),
            "metrics": self.metrics.report(),
            "belief_summary": self.belief.summary(),
        }

    def emitter_inspector(self) -> dict:
        emitters = self.env.emitter_metadata()
        t = self.env.time
        for e in emitters:
            bb = self.belief.band_belief(e["home_band"])
            pred = self.prediction.prediction(e["home_band"])
            e["learned_belief"] = round(bb.belief, 3)
            e["learned_period"] = round(bb.estimated_period, 2)
            e["last_detection_time"] = round(bb.last_hit_time, 2)
            e["predicted_next_event"] = round(pred.next_event_time, 2) if pred.has_prediction else None
            e["prediction_confidence"] = round(pred.confidence, 3) if pred.has_prediction else 0.0
        future = self.env.future_emitter_events(t, horizon=50.0)
        return {"emitters": emitters, "analyst_view": {"future_ground_truth": future}}
