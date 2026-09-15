from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Emitter:
    id: str
    type: str
    home_band: int
    period: float
    duty_cycle: float
    phase: float = 0.0
    start_time: float = 0.0
    active: bool = True

    def band_at(self, t: float) -> int:
        return self.home_band

    def active_at(self, t: float) -> bool:
        if not self.active or t < self.start_time:
            return False
        cycle = (t - self.phase - self.start_time) % self.period
        on_window = self.duty_cycle * self.period
        return cycle < on_window

    def metadata(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "home_band": self.home_band,
            "period": self.period,
            "duty_cycle": self.duty_cycle,
            "phase": self.phase,
            "start_time": self.start_time,
        }


@dataclass
class PeriodicEmitter(Emitter):
    def __init__(self, id, home_band, period, duty_cycle, phase=0.0, start_time=0.0):
        super().__init__(id, "periodic", home_band, period, duty_cycle, phase, start_time)


@dataclass
class FrequencyAgileEmitter(Emitter):
    hop_set: list = field(default_factory=list)
    hop_interval: float = 1.0

    def __init__(self, id, home_band, period, duty_cycle, hop_set, hop_interval=1.0,
                 phase=0.0, start_time=0.0):
        super().__init__(id, "frequency_agile", home_band, period, duty_cycle, phase, start_time)
        self.hop_set = hop_set if hop_set else [home_band]
        self.hop_interval = hop_interval

    def band_at(self, t: float) -> int:
        if t < self.start_time:
            return self.home_band
        idx = int((t - self.start_time) // self.hop_interval) % len(self.hop_set)
        return self.hop_set[idx]

    def metadata(self) -> dict:
        m = super().metadata()
        m["hop_set"] = self.hop_set
        m["hop_interval"] = self.hop_interval
        return m


@dataclass
class ScanningEmitter(Emitter):
    scan_step: float = 2.0

    def __init__(self, id, home_band, period, duty_cycle, num_bands, scan_step=2.0,
                 phase=0.0, start_time=0.0):
        super().__init__(id, "spatially_scanning", home_band, period, duty_cycle, phase, start_time)
        self.num_bands = num_bands
        self.scan_step = scan_step

    def band_at(self, t: float) -> int:
        if t < self.start_time:
            return self.home_band
        offset = int((t - self.start_time) // self.scan_step)
        return (self.home_band + offset) % self.num_bands

    def metadata(self) -> dict:
        m = super().metadata()
        m["scan_step"] = self.scan_step
        return m


@dataclass
class DynamicEmitter(Emitter):
    change_time: float = 30.0
    new_period: float = 5.0
    new_band: int = 0

    def __init__(self, id, home_band, period, duty_cycle, change_time, new_period, new_band,
                 phase=0.0, start_time=0.0):
        super().__init__(id, "dynamic", home_band, period, duty_cycle, phase, start_time)
        self.change_time = change_time
        self.new_period = new_period
        self.new_band = new_band

    def _is_changed(self, t: float) -> bool:
        return t >= self.start_time + self.change_time

    def band_at(self, t: float) -> int:
        if self._is_changed(t):
            return self.new_band
        return self.home_band

    def active_at(self, t: float) -> bool:
        if not self.active or t < self.start_time:
            return False
        if self._is_changed(t):
            period = self.new_period
        else:
            period = self.period
        cycle = (t - self.phase - self.start_time) % period
        on_window = self.duty_cycle * period
        return cycle < on_window

    def metadata(self) -> dict:
        m = super().metadata()
        m["change_time"] = self.change_time
        m["new_period"] = self.new_period
        m["new_band"] = self.new_band
        return m


SCENARIOS = [
    "cold_start",
    "periodic",
    "frequency_agile",
    "spatially_scanning",
    "multiple_emitters",
    "sudden_threat",
    "dynamic_environment",
]


def build_scenario(scenario: str, num_bands: int = 10, seed: int = 42) -> list[Emitter]:
    rng = random.Random(seed)
    emitters: list[Emitter] = []

    if scenario == "cold_start":
        emitters.append(PeriodicEmitter("E1", home_band=3, period=6.0, duty_cycle=0.25,
                                        phase=rng.uniform(0, 6), start_time=0.0))

    elif scenario == "periodic":
        emitters.append(PeriodicEmitter("E1", home_band=2, period=5.0, duty_cycle=0.3,
                                        phase=1.0))
        emitters.append(PeriodicEmitter("E2", home_band=7, period=8.0, duty_cycle=0.2,
                                        phase=2.5))

    elif scenario == "frequency_agile":
        emitters.append(FrequencyAgileEmitter(
            "E1", home_band=1, period=6.0, duty_cycle=0.3,
            hop_set=[1, 4, 7, 2], hop_interval=2.0, phase=0.5))

    elif scenario == "spatially_scanning":
        emitters.append(ScanningEmitter(
            "E1", home_band=0, period=4.0, duty_cycle=0.4,
            num_bands=num_bands, scan_step=2.0, phase=0.0))

    elif scenario == "multiple_emitters":
        emitters.append(PeriodicEmitter("E1", home_band=1, period=5.0, duty_cycle=0.25, phase=0.0))
        emitters.append(PeriodicEmitter("E2", home_band=4, period=7.0, duty_cycle=0.2, phase=1.5))
        emitters.append(PeriodicEmitter("E3", home_band=8, period=4.0, duty_cycle=0.3, phase=0.8))
        emitters.append(PeriodicEmitter("E4", home_band=6, period=9.0, duty_cycle=0.15, phase=3.0))

    elif scenario == "sudden_threat":
        emitters.append(PeriodicEmitter("E1", home_band=3, period=6.0, duty_cycle=0.3, phase=1.0))
        emitters.append(PeriodicEmitter("E2", home_band=7, period=8.0, duty_cycle=0.2, phase=2.0,
                                         start_time=20.0))

    elif scenario == "dynamic_environment":
        emitters.append(DynamicEmitter(
            "E1", home_band=2, period=5.0, duty_cycle=0.3,
            change_time=25.0, new_period=3.0, new_band=8, phase=0.5))

    else:
        emitters.append(PeriodicEmitter("E1", home_band=0, period=5.0, duty_cycle=0.3))

    return emitters


class RFEnvironment:
    def __init__(self, scenario: str = "cold_start", num_bands: int = 10, seed: int = 42):
        self.scenario = scenario
        self.num_bands = num_bands
        self.seed = seed
        self.rng = random.Random(seed)
        self.emitters = build_scenario(scenario, num_bands, seed)
        self.time = 0.0
        self.band_freqs = [round(2000.0 + i * 100.0, 1) for i in range(num_bands)]

    def reset(self):
        self.rng = random.Random(self.seed)
        self.emitters = build_scenario(self.scenario, self.num_bands, self.seed)
        self.time = 0.0

    def advance(self, dwell_duration: float):
        self.time += dwell_duration

    def active_emitters_at(self, t: float) -> list[dict]:
        result = []
        for e in self.emitters:
            if e.active_at(t):
                result.append({"id": e.id, "band": e.band_at(t), "type": e.type})
        return result

    def emitter_active_in_band(self, t: float, band: int) -> Optional[str]:
        for e in self.emitters:
            if e.active_at(t) and e.band_at(t) == band:
                return e.id
        return None

    def emitter_metadata(self) -> list[dict]:
        return [e.metadata() for e in self.emitters]

    def ground_truth_emitter_for_band(self, t: float, band: int) -> Optional[str]:
        return self.emitter_active_in_band(t, band)

    def future_emitter_events(self, from_t: float, horizon: float = 50.0) -> list[dict]:
        events = []
        for e in self.emitters:
            dt = 0.1
            t = from_t
            last_active = False
            while t <= from_t + horizon:
                is_active = e.active_at(t)
                if is_active and not last_active:
                    events.append({"emitter_id": e.id, "band": e.band_at(t), "time": round(t, 2),
                                   "type": e.type})
                last_active = is_active
                t += dt
        events.sort(key=lambda x: x["time"])
        return events
