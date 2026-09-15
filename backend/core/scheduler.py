from __future__ import annotations

import random
from dataclasses import dataclass, field
import math
from typing import Optional

from .belief import BeliefEngine
from .prediction import PredictionEngine


@dataclass
class ScheduleDecision:
    band: int
    scores: dict
    reason: str

    def to_dict(self) -> dict:
        return {
            "band": self.band,
            "scores": {k: round(v, 3) for k, v in self.scores.items()},
            "reason": self.reason,
        }


class BaseScheduler:
    name: str = "base"

    def __init__(self, num_bands: int, seed: int = 42):
        self.num_bands = num_bands
        self.rng = random.Random(seed)
        self.last_band = -1

    def reset(self):
        self.rng = random.Random(self.rng.randint(0, 10**9))
        self.last_band = -1

    def select(self, belief: BeliefEngine, prediction: PredictionEngine,
               t: float) -> ScheduleDecision:
        raise NotImplementedError


class RoundRobinScheduler(BaseScheduler):
    name = "round_robin"

    def select(self, belief, prediction, t) -> ScheduleDecision:
        band = (self.last_band + 1) % self.num_bands
        self.last_band = band
        return ScheduleDecision(
            band=band,
            scores={"strategy": 1.0},
            reason=f"Round Robin: sequential scan, next band in rotation is #{band}.",
        )


class RandomScheduler(BaseScheduler):
    name = "random"

    def select(self, belief, prediction, t) -> ScheduleDecision:
        band = self.rng.randint(0, self.num_bands - 1)
        self.last_band = band
        return ScheduleDecision(
            band=band,
            scores={"strategy": 1.0},
            reason=f"Random: stochastic band selection, chose #{band}.",
        )


class GreedyScheduler(BaseScheduler):
    name = "greedy"

    def select(self, belief, prediction, t) -> ScheduleDecision:
        best_band = 0
        best_belief = -1.0
        for i in range(self.num_bands):
            b = belief.band_belief(i).belief
            if b > best_belief:
                best_belief = b
                best_band = i
        self.last_band = best_band
        return ScheduleDecision(
            band=best_band,
            scores={"belief": round(best_belief, 3)},
            reason=f"Greedy: exploitation-only, band #{best_band} has highest belief ({best_belief:.2f}).",
        )


class SmartScheduler(BaseScheduler):
    name = "shravan"

    def __init__(self, num_bands: int, seed: int = 42,
                 w_predicted: float = 0.35, w_recent: float = 0.25,
                 w_periodicity: float = 0.15, w_exploration: float = 0.25):
        super().__init__(num_bands, seed)
        self.w_predicted = w_predicted
        self.w_recent = w_recent
        self.w_periodicity = w_periodicity
        self.w_exploration = w_exploration
        self.visit_counts = [0] * num_bands
        self.last_visit: list[float] = [-1.0] * num_bands

    def reset(self):
        super().reset()
        self.visit_counts = [0] * self.num_bands
        self.last_visit = [-1.0] * self.num_bands

    def record_visit(self, band: int, t: float):
        self.visit_counts[band] += 1
        self.last_visit[band] = t

    def select(self, belief: BeliefEngine, prediction: PredictionEngine,
               t: float) -> ScheduleDecision:
        scores_list = []
        total_visits = max(1, sum(self.visit_counts))

        for i in range(self.num_bands):
            bb = belief.band_belief(i)
            pred = prediction.prediction(i)

            if pred.has_prediction and pred.next_event_time > t:
                time_to_event = pred.next_event_time - t
                predicted_score = pred.confidence * math.exp(-0.3 * time_to_event)
            else:
                predicted_score = 0.0

            recency_factor = 0.0
            if bb.last_observed >= 0:
                elapsed = t - bb.last_observed
                recency_factor = math.exp(-0.1 * elapsed)
            recent_score = bb.belief * recency_factor

            periodicity_score = bb.period_confidence if bb.estimated_period > 0 else 0.0

            if self.last_visit[i] < 0:
                exploration_score = 1.0
            else:
                elapsed = t - self.last_visit[i]
                exploration_score = min(1.0, elapsed / 10.0)
            if self.visit_counts[i] == 0:
                exploration_score = 1.0

            total = (self.w_predicted * predicted_score
                     + self.w_recent * recent_score
                     + self.w_periodicity * periodicity_score
                     + self.w_exploration * exploration_score)

            scores_list.append({
                "band": i,
                "total": total,
                "predicted": predicted_score,
                "recent": recent_score,
                "periodicity": periodicity_score,
                "exploration": exploration_score,
            })

        best = max(scores_list, key=lambda s: s["total"])
        band = best["band"]
        self.last_band = band

        reason = self._explain(best, t)
        return ScheduleDecision(
            band=band,
            scores={
                "predicted": best["predicted"],
                "recent": best["recent"],
                "periodicity": best["periodicity"],
                "exploration": best["exploration"],
                "total": best["total"],
            },
            reason=reason,
        )

    def _explain(self, best: dict, t: float) -> str:
        band = best["band"]
        parts = [f"Why Band #{band}?"]

        factors = []
        if best["predicted"] > 0.05:
            factors.append(f"Predicted activity soon (score {best['predicted']:.2f})")
        if best["recent"] > 0.05:
            factors.append(f"Recent hits observed (score {best['recent']:.2f})")
        if best["periodicity"] > 0.05:
            factors.append(f"Strong periodicity (score {best['periodicity']:.2f})")
        if best["exploration"] > 0.5:
            factors.append(f"High exploration value (score {best['exploration']:.2f})")

        if not factors:
            factors.append("No strong signal; defaulting to best available band.")

        reason = " | ".join(parts + factors) + "."
        return reason

    def state(self) -> dict:
        return {
            "weights": {
                "predicted": self.w_predicted,
                "recent": self.w_recent,
                "periodicity": self.w_periodicity,
                "exploration": self.w_exploration,
            },
            "visit_counts": self.visit_counts,
            "name": self.name,
        }


def make_scheduler(name: str, num_bands: int, seed: int = 42, **kwargs) -> BaseScheduler:
    if name == "round_robin":
        return RoundRobinScheduler(num_bands, seed)
    elif name == "random":
        return RandomScheduler(num_bands, seed)
    elif name == "greedy":
        return GreedyScheduler(num_bands, seed)
    elif name == "shravan":
        return SmartScheduler(num_bands, seed, **kwargs)
    raise ValueError(f"Unknown scheduler: {name}")
