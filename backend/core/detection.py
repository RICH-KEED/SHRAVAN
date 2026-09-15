from __future__ import annotations

import random
from typing import Optional


class Detector:
    def __init__(self, false_alarm_rate: float = 0.05, seed: int = 42):
        self.false_alarm_rate = false_alarm_rate
        self.rng = random.Random(seed)

    def detect(self, env, band: int, t: float) -> dict:
        ground_truth_emitter = env.emitter_active_in_band(t, band)

        if ground_truth_emitter is not None:
            roll = self.rng.random()
            if roll > (1.0 - self.false_alarm_rate) * 0.95:
                return {"observation": "miss", "emitter_id": None,
                        "ground_truth": ground_truth_emitter, "confidence": 0.0}
            return {"observation": "hit", "emitter_id": ground_truth_emitter,
                    "ground_truth": ground_truth_emitter, "confidence": 0.95}

        if self.rng.random() < self.false_alarm_rate:
            return {"observation": "false_alarm", "emitter_id": None,
                    "ground_truth": None, "confidence": 0.0}

        return {"observation": "miss", "emitter_id": None,
                "ground_truth": None, "confidence": 0.0}

    def reset(self):
        self.rng = random.Random(self.rng.randint(0, 10**9))
