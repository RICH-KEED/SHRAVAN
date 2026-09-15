from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
import math


@dataclass
class PredictionRecord:
    band: int
    predicted_time: float
    made_at: float


class Metrics:
    def __init__(self, prediction_tolerance: float = 2.5):
        self.prediction_tolerance = prediction_tolerance
        self.reset()

    def reset(self):
        self.total_dwells = 0
        self.hits = 0
        self.misses = 0
        self.false_alarms = 0
        self.missed_detections = 0
        self.true_negatives = 0

        self.total_active_windows = 0
        self.intercepted_windows: set[str] = set()
        self.intercept_times: list[float] = []

        self.predictions_made: list[PredictionRecord] = []
        self.prediction_hits = 0
        self.prediction_checks = 0

        self.rewards: list[float] = []

    def update(self, observation: str, ground_truth_emitter: Optional[str],
               t: float, dwell_duration: float) -> None:
        self.total_dwells += 1

        if ground_truth_emitter is not None:
            if observation == "hit":
                self.hits += 1
            else:
                self.missed_detections += 1
        else:
            if observation == "false_alarm":
                self.false_alarms += 1
            elif observation == "miss":
                self.true_negatives += 1
            elif observation == "hit":
                self.false_alarms += 1

        if observation == "hit":
            self.rewards.append(1.0)
        elif observation == "false_alarm":
            self.rewards.append(-0.5)
        else:
            self.rewards.append(0.0)

        if observation == "hit" and ground_truth_emitter is not None:
            self.intercepted_windows.add(ground_truth_emitter)

    def record_active_window(self, emitter_id: str):
        self.total_active_windows += 1

    def record_intercept_time(self, emitter_id: str, t: float, active_start: float):
        self.intercept_times.append(max(0.0, t - active_start))

    def record_prediction(self, band: int, predicted_time: float, made_at: float):
        self.predictions_made.append(PredictionRecord(band, predicted_time, made_at))

    def evaluate_prediction(self, predicted_time: float, actual_time: float) -> None:
        self.prediction_checks += 1
        if abs(predicted_time - actual_time) <= self.prediction_tolerance:
            self.prediction_hits += 1

    def report(self) -> dict:
        pod = self.hits / (self.hits + self.missed_detections) if (self.hits + self.missed_detections) > 0 else 0.0
        far = self.false_alarms / (self.false_alarms + self.true_negatives) if (self.false_alarms + self.true_negatives) > 0 else 0.0
        interception_rate = len(self.intercepted_windows) / max(1, self.total_active_windows) if self.total_active_windows > 0 else 0.0
        avg_intercept_time = sum(self.intercept_times) / len(self.intercept_times) if self.intercept_times else 0.0
        prediction_accuracy = self.prediction_hits / self.prediction_checks if self.prediction_checks > 0 else 0.0
        avg_reward = sum(self.rewards) / len(self.rewards) if self.rewards else 0.0

        return {
            "total_dwells": self.total_dwells,
            "probability_of_detection": round(pod, 3),
            "false_alarm_rate": round(far, 4),
            "interception_rate": round(interception_rate, 3),
            "average_intercept_time": round(avg_intercept_time, 3),
            "prediction_accuracy": round(prediction_accuracy, 3),
            "average_reward": round(avg_reward, 3),
            "hits": self.hits,
            "misses": self.misses,
            "false_alarms": self.false_alarms,
            "missed_detections": self.missed_detections,
        }
