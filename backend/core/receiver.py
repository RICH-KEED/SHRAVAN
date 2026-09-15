from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Receiver:
    num_bands: int
    dwell_duration: float = 0.5
    instantaneous_bandwidth: float = 100.0
    current_band: int = 0
    status: str = "idle"
    detection: str = "none"
    confidence: float = 0.0
    detected_emitter: Optional[str] = None
    steps: int = 0

    def tune(self, band: int) -> None:
        self.current_band = band
        self.status = "listening"

    def observe(self, observation: str, confidence: float = 0.0,
                emitter_id: Optional[str] = None) -> None:
        self.detection = observation
        self.confidence = confidence
        self.detected_emitter = emitter_id
        self.status = "hit" if observation == "hit" else "miss" if observation == "miss" else "false_alarm"
        self.steps += 1

    def reset(self) -> None:
        self.current_band = 0
        self.status = "idle"
        self.detection = "none"
        self.confidence = 0.0
        self.detected_emitter = None
        self.steps = 0

    def center_frequency(self, env) -> float:
        return env.band_freqs[self.current_band]

    def state(self, env) -> dict:
        return {
            "current_band": self.current_band,
            "center_frequency": self.center_frequency(env),
            "instantaneous_bandwidth": self.instantaneous_bandwidth,
            "dwell_duration": self.dwell_duration,
            "status": self.status,
            "detection": self.detection,
            "confidence": round(self.confidence, 3),
            "detected_emitter": self.detected_emitter,
            "steps": self.steps,
        }
