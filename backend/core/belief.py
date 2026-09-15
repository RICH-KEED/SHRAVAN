from __future__ import annotations

from dataclasses import dataclass, field
import math


@dataclass
class BandBelief:
    band: int
    belief: float = 0.0
    hits: int = 0
    misses: int = 0
    false_alarms: int = 0
    last_observed: float = -1.0
    last_hit_time: float = -1.0
    hit_times: list = field(default_factory=list)
    observation_times: list = field(default_factory=list)
    estimated_period: float = 0.0
    period_confidence: float = 0.0

    def to_dict(self) -> dict:
        return {
            "band": self.band,
            "belief": round(self.belief, 3),
            "hits": self.hits,
            "misses": self.misses,
            "false_alarms": self.false_alarms,
            "last_observed": round(self.last_observed, 2),
            "last_hit_time": round(self.last_hit_time, 2),
            "estimated_period": round(self.estimated_period, 2),
            "period_confidence": round(self.period_confidence, 3),
            "num_observations": len(self.observation_times),
        }


class BeliefEngine:
    def __init__(self, num_bands: int, learning_rate: float = 0.4,
                 decay_rate: float = 0.08, time_decay: float = 0.008):
        self.num_bands = num_bands
        self.learning_rate = learning_rate
        self.decay_rate = decay_rate
        self.time_decay = time_decay
        self.bands = [BandBelief(band=i) for i in range(num_bands)]

    def reset(self):
        self.bands = [BandBelief(band=i) for i in range(self.num_bands)]

    def update(self, band: int, observation: str, t: float) -> BandBelief:
        bb = self.bands[band]
        bb.last_observed = t
        bb.observation_times.append(t)

        if observation == "hit":
            bb.hits += 1
            bb.last_hit_time = t
            bb.hit_times.append(t)
            bb.belief = bb.belief + (1.0 - bb.belief) * self.learning_rate
            self._estimate_period(bb)
        elif observation == "false_alarm":
            bb.false_alarms += 1
            bb.belief = max(0.0, bb.belief - self.decay_rate * 0.5)
        else:
            bb.misses += 1
            bb.belief = max(0.0, bb.belief - self.decay_rate)

        return bb

    def _estimate_period(self, bb: BandBelief) -> None:
        if len(bb.hit_times) < 3:
            bb.estimated_period = 0.0
            bb.period_confidence = 0.0
            return

        intervals = [bb.hit_times[i] - bb.hit_times[i - 1]
                     for i in range(1, len(bb.hit_times))]
        intervals = [iv for iv in intervals if iv >= 1.5]
        if not intervals:
            return

        min_interval = min(intervals)
        near_min = [iv for iv in intervals if abs(iv - min_interval) / max(min_interval, 0.01) < 0.25]
        near_ratio = len(near_min) / len(intervals)

        all_near_min = [iv for iv in intervals if abs(iv - min_interval) / max(min_interval, 0.01) < 0.15]
        harmonic_ratios = []
        for iv in intervals:
            ratio = iv / min_interval
            if abs(ratio - round(ratio)) < 0.2 and round(ratio) >= 1:
                harmonic_ratios.append(round(ratio))

        if harmonic_ratios:
            harmonic_coverage = len(harmonic_ratios) / len(intervals)
            bb.estimated_period = min_interval
            bb.period_confidence = min(1.0, 0.5 + 0.5 * harmonic_coverage) * (0.5 + 0.5 * near_ratio)
        else:
            avg_interval = sum(intervals) / len(intervals)
            diffs = [abs(intervals[i] - intervals[i - 1]) for i in range(1, len(intervals))]
            avg_diff = sum(diffs) / len(diffs) if diffs else 0
            consistency = max(0.0, 1.0 - (avg_diff / max(avg_interval, 0.01)))
            bb.estimated_period = avg_interval
            bb.period_confidence = consistency * 0.5

    def apply_time_decay(self, t: float) -> None:
        for bb in self.bands:
            if bb.last_observed >= 0 and t > bb.last_observed:
                elapsed = t - bb.last_observed
                bb.belief = max(0.0, bb.belief * math.exp(-self.time_decay * elapsed))

    def band_belief(self, band: int) -> BandBelief:
        return self.bands[band]

    def state(self) -> list[dict]:
        return [bb.to_dict() for bb in self.bands]

    def summary(self) -> dict:
        total_hits = sum(bb.hits for bb in self.bands)
        total_misses = sum(bb.misses for bb in self.bands)
        total_fa = sum(bb.false_alarms for bb in self.bands)
        return {
            "total_hits": total_hits,
            "total_misses": total_misses,
            "total_false_alarms": total_fa,
            "total_observations": total_hits + total_misses + total_fa,
        }
