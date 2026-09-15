from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Optional

from .belief import BeliefEngine


@dataclass
class BandPrediction:
    band: int
    next_event_time: float = -1.0
    estimated_period: float = 0.0
    confidence: float = 0.0
    last_updated: float = -1.0
    has_prediction: bool = False

    def to_dict(self) -> dict:
        return {
            "band": self.band,
            "next_event_time": round(self.next_event_time, 2) if self.has_prediction else None,
            "estimated_period": round(self.estimated_period, 2),
            "confidence": round(self.confidence, 3),
            "has_prediction": self.has_prediction,
            "last_updated": round(self.last_updated, 2),
        }


class PredictionEngine:
    def __init__(self, num_bands: int, staleness_threshold: float = 15.0,
                 decay_half_life: float = 10.0, min_hits: int = 3):
        self.num_bands = num_bands
        self.staleness_threshold = staleness_threshold
        self.decay_half_life = decay_half_life
        self.min_hits = min_hits
        self.predictions = [BandPrediction(band=i) for i in range(num_bands)]

    def reset(self):
        self.predictions = [BandPrediction(band=i) for i in range(self.num_bands)]

    def update(self, band: int, belief: BeliefEngine, t: float) -> BandPrediction:
        bb = belief.band_belief(band)
        pred = self.predictions[band]
        pred.last_updated = t

        if bb.hits < self.min_hits or bb.period_confidence <= 0 or bb.estimated_period <= 0:
            pred.has_prediction = False
            pred.confidence = 0.0
            pred.next_event_time = -1.0
            return pred

        period = bb.estimated_period
        last_hit = bb.last_hit_time

        next_time = last_hit + round((t - last_hit) / period) * period
        if next_time < t - period * 0.1:
            next_time += period

        pred.next_event_time = next_time
        pred.estimated_period = period
        pred.has_prediction = True
        pred.confidence = bb.period_confidence * min(1.0, bb.belief * 2.0)
        return pred

    def update_all(self, belief: BeliefEngine, t: float) -> None:
        for i in range(self.num_bands):
            self.update(i, belief, t)

    def apply_staleness_decay(self, t: float) -> None:
        for pred in self.predictions:
            if not pred.has_prediction or pred.last_updated < 0:
                continue
            elapsed = t - pred.last_updated
            if elapsed > 0:
                decay = math.exp(-0.693 * elapsed / self.decay_half_life)
                pred.confidence = pred.confidence * decay
                if pred.confidence < 0.05:
                    pred.has_prediction = False

    def is_stale(self, band: int, t: float) -> bool:
        pred = self.predictions[band]
        if not pred.has_prediction:
            return True
        return (t - pred.last_updated) > self.staleness_threshold

    def prediction(self, band: int) -> BandPrediction:
        return self.predictions[band]

    def state(self) -> list[dict]:
        return [p.to_dict() for p in self.predictions]
