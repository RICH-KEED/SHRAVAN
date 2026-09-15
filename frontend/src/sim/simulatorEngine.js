// Client-Side Cognitive Simulation Engine for SHRAVAN (SIH26055)
// Provides 100% faithful in-browser execution of the Closed-Loop Decision Engine
// Enables zero-latency offline execution and seamless static deployment on Vercel.

class SeededRandom {
  constructor(seed = 42) {
    this.m = 0x80000000
    this.a = 1103515245
    this.c = 12345
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1))
  }

  random() {
    this.state = (this.a * this.state + this.c) % this.m
    return this.state / (this.m - 1)
  }

  uniform(min, max) {
    return min + (max - min) * this.random()
  }

  randint(min, max) {
    return Math.floor(this.uniform(min, max + 1))
  }
}

export class Emitter {
  constructor(id, type, homeBand, period, dutyCycle, phase = 0.0, startTime = 0.0) {
    this.id = id
    this.type = type
    this.homeBand = homeBand
    this.period = period
    this.dutyCycle = dutyCycle
    this.phase = phase
    this.startTime = startTime
    this.active = true
  }

  bandAt(t) {
    return this.homeBand
  }

  activeAt(t) {
    if (!this.active || t < this.startTime) return false
    const cycle = (t - this.phase - this.startTime) % this.period
    const onWindow = this.dutyCycle * this.period
    return (cycle + this.period) % this.period < onWindow
  }

  metadata() {
    return {
      id: this.id,
      type: this.type,
      home_band: this.homeBand,
      period: this.period,
      duty_cycle: this.dutyCycle,
      phase: this.phase,
      start_time: this.startTime,
    }
  }
}

export class PeriodicEmitter extends Emitter {
  constructor(id, homeBand, period, dutyCycle, phase = 0.0, startTime = 0.0) {
    super(id, 'periodic', homeBand, period, dutyCycle, phase, startTime)
  }
}

export class FrequencyAgileEmitter extends Emitter {
  constructor(id, homeBand, period, dutyCycle, hopSet = [], hopInterval = 1.0, phase = 0.0, startTime = 0.0) {
    super(id, 'frequency_agile', homeBand, period, dutyCycle, phase, startTime)
    this.hopSet = hopSet.length ? hopSet : [homeBand]
    this.hopInterval = hopInterval
  }

  bandAt(t) {
    if (t < this.startTime) return this.homeBand
    const idx = Math.floor((t - this.startTime) / this.hopInterval) % this.hopSet.length
    return this.hopSet[idx]
  }

  metadata() {
    const m = super.metadata()
    m.hop_set = this.hopSet
    m.hop_interval = this.hopInterval
    return m
  }
}

export class ScanningEmitter extends Emitter {
  constructor(id, homeBand, period, dutyCycle, numBands, scanStep = 2.0, phase = 0.0, startTime = 0.0) {
    super(id, 'spatially_scanning', homeBand, period, dutyCycle, phase, startTime)
    this.numBands = numBands
    this.scanStep = scanStep
  }

  bandAt(t) {
    if (t < this.startTime) return this.homeBand
    const offset = Math.floor((t - this.startTime) / this.scanStep)
    return (this.homeBand + offset) % this.numBands
  }

  metadata() {
    const m = super.metadata()
    m.scan_step = this.scanStep
    return m
  }
}

export class DynamicEmitter extends Emitter {
  constructor(id, homeBand, period, dutyCycle, changeTime, newPeriod, newBand, phase = 0.0, startTime = 0.0) {
    super(id, 'dynamic', homeBand, period, dutyCycle, phase, startTime)
    this.changeTime = changeTime
    this.newPeriod = newPeriod
    this.newBand = newBand
  }

  isChanged(t) {
    return t >= this.startTime + this.changeTime
  }

  bandAt(t) {
    if (this.isChanged(t)) return this.newBand
    return this.homeBand
  }

  activeAt(t) {
    if (!this.active || t < this.startTime) return false
    const period = this.isChanged(t) ? this.newPeriod : this.period
    const cycle = (t - this.phase - this.startTime) % period
    const onWindow = this.dutyCycle * period
    return (cycle + period) % period < onWindow
  }

  metadata() {
    const m = super.metadata()
    m.change_time = this.changeTime
    m.new_period = this.newPeriod
    m.new_band = this.newBand
    return m
  }
}

export function buildScenario(scenario, numBands = 10, seed = 42) {
  const rng = new SeededRandom(seed)
  const emitters = []

  switch (scenario) {
    case 'cold_start':
      emitters.push(new PeriodicEmitter('E1', 3, 6.0, 0.25, rng.uniform(0, 6), 0.0))
      break
    case 'periodic':
      emitters.push(new PeriodicEmitter('E1', 2, 5.0, 0.3, 1.0))
      emitters.push(new PeriodicEmitter('E2', 7, 8.0, 0.2, 2.5))
      break
    case 'frequency_agile':
      emitters.push(new FrequencyAgileEmitter('E1', 1, 6.0, 0.3, [1, 4, 7, 2], 2.0, 0.5))
      break
    case 'spatially_scanning':
      emitters.push(new ScanningEmitter('E1', 0, 4.0, 0.4, numBands, 2.0, 0.0))
      break
    case 'multiple_emitters':
      emitters.push(new PeriodicEmitter('E1', 1, 5.0, 0.25, 0.0))
      emitters.push(new PeriodicEmitter('E2', 4, 7.0, 0.2, 1.5))
      emitters.push(new PeriodicEmitter('E3', 8, 4.0, 0.3, 0.8))
      emitters.push(new PeriodicEmitter('E4', 6, 9.0, 0.15, 3.0))
      break
    case 'sudden_threat':
      emitters.push(new PeriodicEmitter('E1', 3, 6.0, 0.3, 1.0))
      emitters.push(new PeriodicEmitter('E2', 7, 8.0, 0.2, 2.0, 20.0))
      break
    case 'dynamic_environment':
      emitters.push(new DynamicEmitter('E1', 2, 5.0, 0.3, 25.0, 3.0, 8, 0.5))
      break
    default:
      emitters.push(new PeriodicEmitter('E1', 0, 5.0, 0.3))
      break
  }
  return emitters
}

export class RFEnvironment {
  constructor(scenario = 'cold_start', numBands = 10, seed = 42) {
    this.scenario = scenario
    this.numBands = numBands
    this.seed = seed
    this.rng = new SeededRandom(seed)
    this.emitters = buildScenario(scenario, numBands, seed)
    this.time = 0.0
    this.bandFreqs = Array.from({ length: numBands }, (_, i) => +(2000.0 + i * 100.0).toFixed(1))
  }

  reset() {
    this.rng = new SeededRandom(this.seed)
    this.emitters = buildScenario(this.scenario, this.numBands, this.seed)
    this.time = 0.0
  }

  advance(dwellDuration) {
    this.time = +(this.time + dwellDuration).toFixed(3)
  }

  activeEmittersAt(t) {
    return this.emitters
      .filter((e) => e.activeAt(t))
      .map((e) => ({ id: e.id, band: e.bandAt(t), type: e.type }))
  }

  emitterActiveInBand(t, band) {
    const found = this.emitters.find((e) => e.activeAt(t) && e.bandAt(t) === band)
    return found ? found.id : null
  }

  emitterMetadata() {
    return this.emitters.map((e) => e.metadata())
  }

  futureEmitterEvents(fromT, horizon = 50.0) {
    const events = []
    const dt = 0.1
    for (const e of this.emitters) {
      let t = fromT
      let lastActive = false
      while (t <= fromT + horizon) {
        const isActive = e.activeAt(t)
        if (isActive && !lastActive) {
          events.push({
            emitter_id: e.id,
            band: e.bandAt(t),
            time: +t.toFixed(2),
            type: e.type,
          })
        }
        lastActive = isActive
        t = +(t + dt).toFixed(3)
      }
    }
    events.sort((a, b) => a.time - b.time)
    return events
  }
}

export class Receiver {
  constructor(numBands = 10, dwellDuration = 0.5) {
    this.numBands = numBands
    this.dwellDuration = dwellDuration
    this.instantaneousBandwidth = 100.0
    this.currentBand = 0
    this.status = 'idle'
    this.detection = 'none'
    this.confidence = 0.0
    this.detectedEmitter = null
    this.steps = 0
  }

  tune(band) {
    this.currentBand = band
    this.status = 'listening'
  }

  observe(observation, confidence = 0.0, emitterId = null) {
    this.detection = observation
    this.confidence = confidence
    this.detectedEmitter = emitterId
    this.status = observation === 'hit' ? 'hit' : observation === 'miss' ? 'miss' : 'false_alarm'
    this.steps += 1
  }

  reset() {
    this.currentBand = 0
    this.status = 'idle'
    this.detection = 'none'
    this.confidence = 0.0
    this.detectedEmitter = null
    this.steps = 0
  }

  centerFrequency(env) {
    return env.bandFreqs[this.currentBand]
  }

  state(env) {
    return {
      current_band: this.currentBand,
      center_frequency: this.centerFrequency(env),
      instantaneous_bandwidth: this.instantaneousBandwidth,
      dwell_duration: this.dwellDuration,
      status: this.status,
      detection: this.detection,
      confidence: +this.confidence.toFixed(3),
      detected_emitter: this.detectedEmitter,
      steps: this.steps,
    }
  }
}

export class Detector {
  constructor(falseAlarmRate = 0.05, seed = 42) {
    this.falseAlarmRate = falseAlarmRate
    this.rng = new SeededRandom(seed)
  }

  detect(env, band, t) {
    const groundTruthEmitter = env.emitterActiveInBand(t, band)

    if (groundTruthEmitter !== null) {
      const roll = this.rng.random()
      if (roll > (1.0 - this.falseAlarmRate) * 0.95) {
        return { observation: 'miss', emitter_id: null, ground_truth: groundTruthEmitter, confidence: 0.0 }
      }
      return { observation: 'hit', emitter_id: groundTruthEmitter, ground_truth: groundTruthEmitter, confidence: 0.95 }
    }

    if (this.rng.random() < this.falseAlarmRate) {
      return { observation: 'false_alarm', emitter_id: null, ground_truth: null, confidence: 0.0 }
    }

    return { observation: 'miss', emitter_id: null, ground_truth: null, confidence: 0.0 }
  }

  reset() {
    this.rng = new SeededRandom(Math.floor(Math.random() * 1000000))
  }
}

export class BandBelief {
  constructor(band) {
    this.band = band
    this.belief = 0.0
    this.hits = 0
    this.misses = 0
    this.falseAlarms = 0
    this.lastObserved = -1.0
    this.lastHitTime = -1.0
    this.hitTimes = []
    this.observationTimes = []
    this.estimatedPeriod = 0.0
    this.periodConfidence = 0.0
  }

  toDict() {
    return {
      band: this.band,
      belief: +this.belief.toFixed(3),
      hits: this.hits,
      misses: this.misses,
      false_alarms: this.falseAlarms,
      last_observed: +this.lastObserved.toFixed(2),
      last_hit_time: +this.lastHitTime.toFixed(2),
      estimated_period: +this.estimatedPeriod.toFixed(2),
      period_confidence: +this.periodConfidence.toFixed(3),
      num_observations: this.observationTimes.length,
    }
  }
}

export class BeliefEngine {
  constructor(numBands = 10, learningRate = 0.4, decayRate = 0.08, timeDecay = 0.008) {
    this.numBands = numBands
    this.learningRate = learningRate
    this.decayRate = decayRate
    this.timeDecay = timeDecay
    this.bands = Array.from({ length: numBands }, (_, i) => new BandBelief(i))
  }

  reset() {
    this.bands = Array.from({ length: this.numBands }, (_, i) => new BandBelief(i))
  }

  update(band, observation, t) {
    const bb = this.bands[band]
    bb.lastObserved = t
    bb.observationTimes.push(t)

    if (observation === 'hit') {
      bb.hits += 1
      bb.lastHitTime = t
      bb.hitTimes.push(t)
      bb.belief = bb.belief + (1.0 - bb.belief) * this.learningRate
      this._estimatePeriod(bb)
    } else if (observation === 'false_alarm') {
      bb.falseAlarms += 1
      bb.belief = Math.max(0.0, bb.belief - this.decayRate * 0.5)
    } else {
      bb.misses += 1
      bb.belief = Math.max(0.0, bb.belief - this.decayRate)
    }
    return bb
  }

  _estimatePeriod(bb) {
    if (bb.hitTimes.length < 3) {
      bb.estimatedPeriod = 0.0
      bb.periodConfidence = 0.0
      return
    }

    const intervals = []
    for (let i = 1; i < bb.hitTimes.length; i++) {
      const iv = bb.hitTimes[i] - bb.hitTimes[i - 1]
      if (iv >= 1.5) intervals.push(iv)
    }

    if (!intervals.length) return

    const minInterval = Math.min(...intervals)
    const nearMin = intervals.filter((iv) => Math.abs(iv - minInterval) / Math.max(minInterval, 0.01) < 0.25)
    const nearRatio = nearMin.length / intervals.length

    const harmonicRatios = []
    for (const iv of intervals) {
      const ratio = iv / minInterval
      if (Math.abs(ratio - Math.round(ratio)) < 0.2 && Math.round(ratio) >= 1) {
        harmonicRatios.push(Math.round(ratio))
      }
    }

    if (harmonicRatios.length) {
      const harmonicCoverage = harmonicRatios.length / intervals.length
      bb.estimatedPeriod = minInterval
      bb.periodConfidence = Math.min(1.0, 0.5 + 0.5 * harmonicCoverage) * (0.5 + 0.5 * nearRatio)
    } else {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const diffs = []
      for (let i = 1; i < intervals.length; i++) {
        diffs.push(Math.abs(intervals[i] - intervals[i - 1]))
      }
      const avgDiff = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0
      const consistency = Math.max(0.0, 1.0 - avgDiff / Math.max(avgInterval, 0.01))
      bb.estimatedPeriod = avgInterval
      bb.periodConfidence = consistency * 0.5
    }
  }

  applyTimeDecay(t) {
    for (const bb of this.bands) {
      if (bb.lastObserved >= 0 && t > bb.lastObserved) {
        const elapsed = t - bb.lastObserved
        bb.belief = Math.max(0.0, bb.belief * Math.exp(-this.timeDecay * elapsed))
      }
    }
  }

  bandBelief(band) {
    return this.bands[band]
  }

  state() {
    return this.bands.map((bb) => bb.toDict())
  }

  summary() {
    const totalHits = this.bands.reduce((sum, b) => sum + b.hits, 0)
    const totalMisses = this.bands.reduce((sum, b) => sum + b.misses, 0)
    const totalFa = this.bands.reduce((sum, b) => sum + b.falseAlarms, 0)
    return {
      total_hits: totalHits,
      total_misses: totalMisses,
      total_false_alarms: totalFa,
      total_observations: totalHits + totalMisses + totalFa,
    }
  }
}

export class BandPrediction {
  constructor(band) {
    this.band = band
    this.nextEventTime = -1.0
    this.estimatedPeriod = 0.0
    this.confidence = 0.0
    this.lastUpdated = -1.0
    this.hasPrediction = false
  }

  toDict() {
    return {
      band: this.band,
      next_event_time: this.hasPrediction ? +this.nextEventTime.toFixed(2) : null,
      estimated_period: +this.estimatedPeriod.toFixed(2),
      confidence: +this.confidence.toFixed(3),
      has_prediction: this.hasPrediction,
      last_updated: +this.lastUpdated.toFixed(2),
    }
  }
}

export class PredictionEngine {
  constructor(numBands = 10, stalenessThreshold = 15.0, decayHalfLife = 10.0, minHits = 3) {
    this.numBands = numBands
    this.stalenessThreshold = stalenessThreshold
    this.decayHalfLife = decayHalfLife
    this.minHits = minHits
    this.predictions = Array.from({ length: numBands }, (_, i) => new BandPrediction(i))
  }

  reset() {
    this.predictions = Array.from({ length: this.numBands }, (_, i) => new BandPrediction(i))
  }

  update(band, belief, t) {
    const bb = belief.bandBelief(band)
    const pred = this.predictions[band]
    pred.lastUpdated = t

    if (bb.hits < this.minHits || bb.periodConfidence <= 0 || bb.estimatedPeriod <= 0) {
      pred.hasPrediction = false
      pred.confidence = 0.0
      pred.nextEventTime = -1.0
      return pred
    }

    const period = bb.estimatedPeriod
    const lastHit = bb.lastHitTime

    let nextTime = lastHit + Math.round((t - lastHit) / period) * period
    if (nextTime < t - period * 0.1) {
      nextTime += period
    }

    pred.nextEventTime = nextTime
    pred.estimatedPeriod = period
    pred.hasPrediction = true
    pred.confidence = bb.periodConfidence * Math.min(1.0, bb.belief * 2.0)
    return pred
  }

  updateAll(belief, t) {
    for (let i = 0; i < this.numBands; i++) {
      this.update(i, belief, t)
    }
  }

  applyStalenessDecay(t) {
    for (const pred of this.predictions) {
      if (!pred.hasPrediction || pred.lastUpdated < 0) continue
      const elapsed = t - pred.lastUpdated
      if (elapsed > 0) {
        const decay = Math.exp((-0.693 * elapsed) / this.decayHalfLife)
        pred.confidence *= decay
        if (pred.confidence < 0.05) {
          pred.hasPrediction = false
        }
      }
    }
  }

  isStale(band, t) {
    const pred = this.predictions[band]
    if (!pred.hasPrediction) return true
    return t - pred.lastUpdated > this.stalenessThreshold
  }

  prediction(band) {
    return this.predictions[band]
  }

  state() {
    return this.predictions.map((p) => p.toDict())
  }
}

export class BaseScheduler {
  constructor(numBands = 10, seed = 42) {
    this.name = 'base'
    this.numBands = numBands
    this.rng = new SeededRandom(seed)
    this.lastBand = -1
  }

  reset() {
    this.rng = new SeededRandom(Math.floor(Math.random() * 1000000))
    this.lastBand = -1
  }

  select(belief, prediction, t) {
    throw new Error('Not implemented')
  }
}

export class RoundRobinScheduler extends BaseScheduler {
  constructor(numBands, seed) {
    super(numBands, seed)
    this.name = 'round_robin'
  }

  select(belief, prediction, t) {
    const band = (this.lastBand + 1) % this.numBands
    this.lastBand = band
    return {
      band,
      scores: { strategy: 1.0 },
      reason: `Round Robin: sequential scan, next band in rotation is #${band}.`,
      to_dict() {
        return { band: this.band, scores: this.scores, reason: this.reason }
      },
    }
  }
}

export class RandomScheduler extends BaseScheduler {
  constructor(numBands, seed) {
    super(numBands, seed)
    this.name = 'random'
  }

  select(belief, prediction, t) {
    const band = this.rng.randint(0, this.numBands - 1)
    this.lastBand = band
    return {
      band,
      scores: { strategy: 1.0 },
      reason: `Random: stochastic band selection, chose #${band}.`,
      to_dict() {
        return { band: this.band, scores: this.scores, reason: this.reason }
      },
    }
  }
}

export class GreedyScheduler extends BaseScheduler {
  constructor(numBands, seed) {
    super(numBands, seed)
    this.name = 'greedy'
  }

  select(belief, prediction, t) {
    let bestBand = 0
    let bestBelief = -1.0
    for (let i = 0; i < this.numBands; i++) {
      const b = belief.bandBelief(i).belief
      if (b > bestBelief) {
        bestBelief = b
        bestBand = i
      }
    }
    this.lastBand = bestBand
    return {
      band: bestBand,
      scores: { belief: +bestBelief.toFixed(3) },
      reason: `Greedy: exploitation-only, band #${bestBand} has highest belief (${bestBelief.toFixed(2)}).`,
      to_dict() {
        return { band: this.band, scores: this.scores, reason: this.reason }
      },
    }
  }
}

export class SmartScheduler extends BaseScheduler {
  constructor(numBands = 10, seed = 42, wPredicted = 0.35, wRecent = 0.25, wPeriodicity = 0.15, wExploration = 0.25) {
    super(numBands, seed)
    this.name = 'shravan'
    this.wPredicted = wPredicted
    this.wRecent = wRecent
    this.wPeriodicity = wPeriodicity
    this.wExploration = wExploration
    this.visitCounts = Array(numBands).fill(0)
    this.lastVisit = Array(numBands).fill(-1.0)
  }

  reset() {
    super.reset()
    this.visitCounts = Array(this.numBands).fill(0)
    this.lastVisit = Array(this.numBands).fill(-1.0)
  }

  recordVisit(band, t) {
    this.visitCounts[band] += 1
    this.lastVisit[band] = t
  }

  select(belief, prediction, t) {
    const scoresList = []

    for (let i = 0; i < this.numBands; i++) {
      const bb = belief.bandBelief(i)
      const pred = prediction.prediction(i)

      let predictedScore = 0.0
      if (pred.hasPrediction && pred.nextEventTime > t) {
        const timeToEvent = pred.nextEventTime - t
        predictedScore = pred.confidence * Math.exp(-0.3 * timeToEvent)
      }

      let recencyFactor = 0.0
      if (bb.lastObserved >= 0) {
        const elapsed = t - bb.lastObserved
        recencyFactor = Math.exp(-0.1 * elapsed)
      }
      const recentScore = bb.belief * recencyFactor

      const periodicityScore = bb.estimatedPeriod > 0 ? bb.periodConfidence : 0.0

      let explorationScore = 1.0
      if (this.lastVisit[i] >= 0) {
        const elapsed = t - this.lastVisit[i]
        explorationScore = Math.min(1.0, elapsed / 10.0)
      }
      if (this.visitCounts[i] === 0) {
        explorationScore = 1.0
      }

      const total =
        this.wPredicted * predictedScore +
        this.wRecent * recentScore +
        this.wPeriodicity * periodicityScore +
        this.wExploration * explorationScore

      scoresList.push({
        band: i,
        total,
        predicted: predictedScore,
        recent: recentScore,
        periodicity: periodicityScore,
        exploration: explorationScore,
      })
    }

    let best = scoresList[0]
    for (let i = 1; i < scoresList.length; i++) {
      if (scoresList[i].total > best.total) {
        best = scoresList[i]
      }
    }

    this.lastBand = best.band
    const reason = this._explain(best, t)

    return {
      band: best.band,
      scores: {
        predicted: +best.predicted.toFixed(3),
        recent: +best.recent.toFixed(3),
        periodicity: +best.periodicity.toFixed(3),
        exploration: +best.exploration.toFixed(3),
        total: +best.total.toFixed(3),
      },
      reason,
      to_dict() {
        return { band: this.band, scores: this.scores, reason: this.reason }
      },
    }
  }

  _explain(best, t) {
    const band = best.band
    const factors = []
    if (best.predicted > 0.05) factors.push(`Predicted activity soon (score ${best.predicted.toFixed(2)})`)
    if (best.recent > 0.05) factors.push(`Recent hits observed (score ${best.recent.toFixed(2)})`)
    if (best.periodicity > 0.05) factors.push(`Strong periodicity (score ${best.periodicity.toFixed(2)})`)
    if (best.exploration > 0.5) factors.push(`High exploration value (score ${best.exploration.toFixed(2)})`)
    if (!factors.length) factors.push('No strong signal; defaulting to best available band.')

    return `Why Band #${band}? | ${factors.join(' | ')}.`
  }

  state() {
    return {
      weights: {
        predicted: this.wPredicted,
        recent: this.wRecent,
        periodicity: this.wPeriodicity,
        exploration: this.wExploration,
      },
      visit_counts: [...this.visitCounts],
      name: this.name,
    }
  }
}

export function makeScheduler(name, numBands = 10, seed = 42, weights = {}) {
  switch (name) {
    case 'round_robin':
      return new RoundRobinScheduler(numBands, seed)
    case 'random':
      return new RandomScheduler(numBands, seed)
    case 'greedy':
      return new GreedyScheduler(numBands, seed)
    case 'shravan':
      return new SmartScheduler(
        numBands,
        seed,
        weights.predicted ?? 0.35,
        weights.recent ?? 0.25,
        weights.periodicity ?? 0.15,
        weights.exploration ?? 0.25
      )
    default:
      return new SmartScheduler(numBands, seed)
  }
}

export class Metrics {
  constructor(predictionTolerance = 2.5) {
    this.predictionTolerance = predictionTolerance
    this.reset()
  }

  reset() {
    this.totalDwells = 0
    this.hits = 0
    this.misses = 0
    this.falseAlarms = 0
    this.missedDetections = 0
    this.trueNegatives = 0
    this.totalActiveWindows = 0
    this.interceptedWindows = new Set()
    this.interceptTimes = []
    this.predictionChecks = 0
    this.predictionHits = 0
    this.rewards = []
  }

  update(observation, groundTruthEmitter, t, dwellDuration) {
    this.totalDwells += 1

    if (groundTruthEmitter !== null) {
      if (observation === 'hit') {
        this.hits += 1
      } else {
        this.missedDetections += 1
      }
    } else {
      if (observation === 'false_alarm') {
        this.falseAlarms += 1
      } else if (observation === 'miss') {
        this.trueNegatives += 1
      } else if (observation === 'hit') {
        this.falseAlarms += 1
      }
    }

    if (observation === 'hit') this.rewards.push(1.0)
    else if (observation === 'false_alarm') this.rewards.push(-0.5)
    else this.rewards.push(0.0)

    if (observation === 'hit' && groundTruthEmitter !== null) {
      this.interceptedWindows.add(groundTruthEmitter)
    }
  }

  recordActiveWindow(emitterId) {
    this.totalActiveWindows += 1
  }

  recordInterceptTime(emitterId, t, activeStart) {
    this.interceptTimes.push(Math.max(0.0, t - activeStart))
  }

  evaluatePrediction(predictedTime, actualTime) {
    this.predictionChecks += 1
    if (Math.abs(predictedTime - actualTime) <= this.predictionTolerance) {
      this.predictionHits += 1
    }
  }

  report() {
    const pod = this.hits + this.missedDetections > 0 ? this.hits / (this.hits + this.missedDetections) : 0.0
    const far =
      this.falseAlarms + this.trueNegatives > 0 ? this.falseAlarms / (this.falseAlarms + this.trueNegatives) : 0.0
    const interceptionRate =
      this.totalActiveWindows > 0 ? this.interceptedWindows.size / this.totalActiveWindows : 0.0
    const avgInterceptTime =
      this.interceptTimes.length > 0
        ? this.interceptTimes.reduce((a, b) => a + b, 0) / this.interceptTimes.length
        : 0.0
    const predictionAccuracy = this.predictionChecks > 0 ? this.predictionHits / this.predictionChecks : 0.0
    const avgReward = this.rewards.length > 0 ? this.rewards.reduce((a, b) => a + b, 0) / this.rewards.length : 0.0

    return {
      total_dwells: this.totalDwells,
      probability_of_detection: +pod.toFixed(3),
      false_alarm_rate: +far.toFixed(4),
      interception_rate: +interceptionRate.toFixed(3),
      average_intercept_time: +avgInterceptTime.toFixed(3),
      prediction_accuracy: +predictionAccuracy.toFixed(3),
      average_reward: +avgReward.toFixed(3),
      hits: this.hits,
      misses: this.misses,
      false_alarms: this.falseAlarms,
      missed_detections: this.missedDetections,
    }
  }
}

export class Orchestrator {
  constructor(config = {}) {
    const {
      scenario = 'cold_start',
      numBands = 10,
      seed = 42,
      dwellDuration = 0.5,
      falseAlarmRate = 0.05,
      schedulerName = 'shravan',
      schedulerWeights = null,
    } = config

    this.scenario = scenario
    this.numBands = numBands
    this.seed = seed
    this.dwellDuration = dwellDuration
    this.falseAlarmRate = falseAlarmRate

    this.env = new RFEnvironment(scenario, numBands, seed)
    this.receiver = new Receiver(numBands, dwellDuration)
    this.detector = new Detector(falseAlarmRate, seed)
    this.belief = new BeliefEngine(numBands)
    this.prediction = new PredictionEngine(numBands)
    this.scheduler = makeScheduler(schedulerName, numBands, seed, schedulerWeights || {})
    this.metrics = new Metrics()

    this.events = []
    this.rfMap = []
    this._firstContact = false
    this._patternDetected = new Set()
    this._intercepted = new Set()
    this._adaptationLogged = false
    this.running = false
    this.lastDecision = null
    this._prevEmitterActive = {}
  }

  reset(config = {}) {
    if (config.scenario) this.scenario = config.scenario
    if (config.seed) this.seed = config.seed

    this.env = new RFEnvironment(this.scenario, this.numBands, this.seed)
    this.receiver.reset()
    this.detector.reset()
    this.belief.reset()
    this.prediction.reset()

    const sname = config.scheduler_name || this.scheduler.name
    this.scheduler = makeScheduler(sname, this.numBands, this.seed, config.scheduler_weights || {})
    this.metrics = new Metrics()

    this.events = []
    this.rfMap = []
    this._firstContact = false
    this._patternDetected = new Set()
    this._intercepted = new Set()
    this._adaptationLogged = false
    this.running = false
    this.lastDecision = null
    this._prevEmitterActive = {}
  }

  step() {
    const t = this.env.time

    const decision = this.scheduler.select(this.belief, this.prediction, t)
    const band = decision.band
    this.lastDecision = decision

    if (this.scheduler instanceof SmartScheduler) {
      this.scheduler.recordVisit(band, t)
    }

    this.receiver.tune(band)

    const detection = this.detector.detect(this.env, band, t)
    const observation = detection.observation
    const groundTruth = detection.ground_truth
    const confidence = detection.confidence

    this.receiver.observe(observation, confidence, detection.emitter_id)

    const preUpdatePrediction = { ...this.prediction.prediction(band) }

    this.belief.update(band, observation, t)
    this.prediction.updateAll(this.belief, t)
    this.prediction.applyStalenessDecay(t)
    this.belief.applyTimeDecay(t)

    this.metrics.update(observation, groundTruth, t, this.dwellDuration)

    const currentActive = new Set(this.env.activeEmittersAt(t).map((e) => e.id))
    for (const eid of currentActive) {
      if (!this._prevEmitterActive[eid]) {
        this.metrics.recordActiveWindow(eid)
      }
    }
    this._prevEmitterActive = {}
    for (const eid of currentActive) this._prevEmitterActive[eid] = true

    if (observation === 'hit' && preUpdatePrediction.hasPrediction && groundTruth) {
      const predictedT = preUpdatePrediction.nextEventTime
      if (Math.abs(predictedT - t) <= preUpdatePrediction.estimatedPeriod * 0.5) {
        this.metrics.evaluatePrediction(predictedT, t)
      }
      this.metrics.recordInterceptTime(groundTruth, t, t - preUpdatePrediction.estimatedPeriod)
    }

    this._checkEvents(band, observation, groundTruth, t)
    this._recordRfMap(band, observation, groundTruth, t)

    this.env.advance(this.dwellDuration)

    return this.state()
  }

  _checkEvents(band, observation, groundTruth, t) {
    if (observation === 'hit' && !this._firstContact) {
      this._firstContact = true
      this.events.push({
        time: +t.toFixed(2),
        type: 'first_contact',
        band,
        emitter: groundTruth,
        message: `First contact: emitter ${groundTruth} detected in band #${band}.`,
      })
    }

    const bb = this.belief.bandBelief(band)
    if (!this._patternDetected.has(band) && bb.estimatedPeriod > 0 && bb.periodConfidence > 0.5) {
      this._patternDetected.add(band)
      this.events.push({
        time: +t.toFixed(2),
        type: 'pattern_detection',
        band,
        message: `Pattern detected in band #${band}: period ~${bb.estimatedPeriod.toFixed(1)}s (confidence ${bb.periodConfidence.toFixed(2)}).`,
      })
    }

    if (observation === 'hit' && groundTruth && !this._intercepted.has(groundTruth)) {
      this._intercepted.add(groundTruth)
      this.events.push({
        time: +t.toFixed(2),
        type: 'interception',
        band,
        emitter: groundTruth,
        message: `Interception: emitter ${groundTruth} intercepted in band #${band}.`,
      })
    }

    for (let i = 0; i < this.numBands; i++) {
      const pred = this.prediction.prediction(i)
      if (pred.hasPrediction && pred.confidence < 0.1 && this._patternDetected.has(i) && !this._adaptationLogged) {
        this._adaptationLogged = true
        this.events.push({
          time: +t.toFixed(2),
          type: 'adaptation',
          band: i,
          message: `Adaptation: prediction for band #${i} became stale, switching to exploration.`,
        })
      }
    }
  }

  _recordRfMap(band, observation, groundTruth, t) {
    const activeBands = this.env.activeEmittersAt(t).map((e) => e.band)
    this.rfMap.push({
      time: +t.toFixed(2),
      observed_band: band,
      observation,
      active_bands: Array.from(new Set(activeBands)).sort((a, b) => a - b),
      hit: observation === 'hit',
    })
  }

  run(numSteps) {
    const results = []
    for (let i = 0; i < numSteps; i++) {
      results.push(this.step())
    }
    return results
  }

  state() {
    const t = this.env.time
    return {
      running: this.running,
      scenario: this.scenario,
      mission_time: +t.toFixed(2),
      step: this.receiver.steps,
      receiver: this.receiver.state(this.env),
      scheduler: {
        name: this.scheduler.name,
        decision: this._lastDecision(),
      },
      belief: this.belief.state(),
      belief_summary: this.belief.summary(),
      prediction: this.prediction.state(),
      metrics: this.metrics.report(),
      events: this.events.slice(-20),
      rf_map: this.rfMap.slice(-100),
      scheduler_state: this.scheduler.state ? this.scheduler.state() : {},
      emitter_metadata: this.env.emitterMetadata(),
      ground_truth_active: this.env.activeEmittersAt(t),
      future_events: this.env.futureEmitterEvents(t, 30.0),
      num_bands: this.numBands,
    }
  }

  _lastDecision() {
    if (!this.lastDecision) {
      const band = this.scheduler.lastBand >= 0 ? this.scheduler.lastBand : 0
      return { band, scores: {}, reason: 'Pending first decision.' }
    }
    return this.lastDecision.to_dict ? this.lastDecision.to_dict() : this.lastDecision
  }

  inspectorState() {
    return {
      receiver: this.receiver.state(this.env),
      detection: {
        false_alarm_rate: this.detector.falseAlarmRate,
      },
      scheduler_weights: this.scheduler.state ? this.scheduler.state() : {},
      belief: this.belief.state(),
      prediction: this.prediction.state(),
      metrics: this.metrics.report(),
      belief_summary: this.belief.summary(),
    }
  }

  emitterInspector() {
    const emitters = this.env.emitterMetadata()
    const t = this.env.time
    for (const e of emitters) {
      const bb = this.belief.bandBelief(e.home_band)
      const pred = this.prediction.prediction(e.home_band)
      e.learned_belief = +bb.belief.toFixed(3)
      e.learned_period = +bb.estimatedPeriod.toFixed(2)
      e.last_detection_time = +bb.lastHitTime.toFixed(2)
      e.predicted_next_event = pred.hasPrediction ? +pred.nextEventTime.toFixed(2) : null
      e.prediction_confidence = pred.hasPrediction ? +pred.confidence.toFixed(3) : 0.0
    }
    const future = this.env.futureEmitterEvents(t, 50.0)
    return {
      emitters,
      analyst_view: {
        future_ground_truth: future,
      },
    }
  }
}

export function runBenchmark(config = {}) {
  const {
    scenario = 'periodic',
    num_bands = 10,
    seed = 42,
    num_steps = 200,
    dwell_duration = 0.5,
    false_alarm_rate = 0.05,
  } = config

  const STRATEGIES = ['round_robin', 'random', 'greedy', 'shravan']
  const results = []

  for (const strategy of STRATEGIES) {
    const orch = new Orchestrator({
      scenario,
      numBands: num_bands,
      seed,
      dwellDuration: dwell_duration,
      falseAlarmRate: false_alarm_rate,
      schedulerName: strategy,
    })
    orch.run(num_steps)
    const report = orch.metrics.report()
    report.strategy = strategy
    report.scenario = scenario
    report.seed = seed
    report.num_steps = num_steps
    results.push(report)
  }

  const metricsKeys = [
    'probability_of_detection',
    'false_alarm_rate',
    'interception_rate',
    'average_intercept_time',
    'prediction_accuracy',
    'average_reward',
  ]

  const summary = {}
  for (const key of metricsKeys) {
    summary[key] = {}
    for (const r of results) {
      summary[key][r.strategy] = r[key]
    }
  }

  const best = {}
  for (const key of metricsKeys) {
    if (key === 'false_alarm_rate' || key === 'average_intercept_time') {
      let minVal = Infinity
      let bestStrat = STRATEGIES[0]
      for (const r of results) {
        if (r[key] < minVal) {
          minVal = r[key]
          bestStrat = r.strategy
        }
      }
      best[key] = bestStrat
    } else {
      let maxVal = -Infinity
      let bestStrat = STRATEGIES[0]
      for (const r of results) {
        if (r[key] > maxVal) {
          maxVal = r[key]
          bestStrat = r.strategy
        }
      }
      best[key] = bestStrat
    }
  }
  summary.best = best

  return {
    config: {
      scenario,
      num_bands,
      seed,
      num_steps,
      dwell_duration,
      false_alarm_rate,
    },
    strategies: STRATEGIES,
    results,
    summary,
  }
}
