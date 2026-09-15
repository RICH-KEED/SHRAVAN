import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/client.js'
import {
  CompassIcon,
  ClockIcon,
  SignalWaveIcon,
  RadarIcon,
  TargetIcon,
  ShieldAlertIcon,
  ActivityIcon,
  EventIcon,
} from './Icons.jsx'

const SCENARIOS = [
  {
    value: 'cold_start',
    label: 'Cold Start',
    icon: CompassIcon,
    difficulty: 'Baseline',
    desc: 'No prior emitter intelligence. System must explore blindly across all 10 bands and build belief entirely from scratch.',
  },
  {
    value: 'periodic',
    label: 'Periodic Emitter',
    icon: ClockIcon,
    difficulty: 'Pattern',
    desc: 'Two emitters with regular timing intervals. Tests rapid period estimation, recurrence tracking, and prediction confidence.',
  },
  {
    value: 'frequency_agile',
    label: 'Frequency Agile',
    icon: SignalWaveIcon,
    difficulty: 'Agile',
    desc: 'Emitter hops dynamically between multiple frequency bands. Tests agile tracking and multi-band correlation.',
  },
  {
    value: 'spatially_scanning',
    label: 'Spatially Scanning',
    icon: RadarIcon,
    difficulty: 'Scanning',
    desc: 'Emitter sweeps sequentially across bands. Tests directional prediction and anticipation of adjacent channels.',
  },
  {
    value: 'multiple_emitters',
    label: 'Multiple Emitters',
    icon: TargetIcon,
    difficulty: 'Multi-Target',
    desc: 'Four concurrent emitters with distinct periods and duty cycles. Tests multi-objective priority scheduling.',
  },
  {
    value: 'sudden_threat',
    label: 'Sudden Threat',
    icon: ShieldAlertIcon,
    difficulty: 'High Alert',
    desc: 'A high-priority new emitter appears abruptly mid-mission. Tests cold-start adaptation after prior learning.',
  },
  {
    value: 'dynamic_environment',
    label: 'Dynamic Environment',
    icon: ActivityIcon,
    difficulty: 'Adaptive',
    desc: 'Emitter switches home band and cycle mid-mission. Tests stale prediction decay and autonomous re-exploration.',
  },
]

export default function ScenarioLab() {
  const [selected, setSelected] = useState('cold_start')
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [runningSteps, setRunningSteps] = useState(false)
  const [error, setError] = useState(null)

  const initScenario = useCallback(async (scenarioKey) => {
    setSelected(scenarioKey)
    setLoading(true)
    setError(null)
    try {
      await api.stopAutoRun().catch(() => {})
      const s = await api.initSim({ scenario: scenarioKey, num_bands: 10, seed: 42 })
      setState(s)
    } catch (err) {
      console.error('Scenario init error:', err)
      setError(err.message || 'Failed to initialize scenario.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRun = async (steps) => {
    if (runningSteps || loading) return
    setRunningSteps(true)
    setError(null)
    try {
      const s = await api.runSim(steps)
      setState(s)
    } catch (err) {
      setError(`Simulation run failed: ${err.message}`)
    } finally {
      setRunningSteps(false)
    }
  }

  useEffect(() => {
    initScenario('cold_start')
  }, [initScenario])

  const selectedScenarioInfo = SCENARIOS.find((s) => s.value === selected)

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">
          <TargetIcon size={24} style={{ color: 'var(--accent)' }} />
          <span>Tactical Scenario Lab</span>
        </h1>
        <p className="page-subtitle">
          Execute controlled Electronic Warfare environments to evaluate adaptive scan performance
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-banner-content">
            <span className="error-banner-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-xs" onClick={() => initScenario(selected)}>
            Retry
          </button>
        </div>
      )}

      {/* 2-COLUMN LAB LAYOUT: SCENARIO GRID + LIVE RUN PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        {/* SCENARIO SELECTOR CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {SCENARIOS.map((s) => {
            const isActive = selected === s.value
            const IconComp = s.icon
            return (
              <div
                key={s.value}
                className={`scenario-card ${isActive ? 'active' : ''}`}
                style={{ padding: '16px 18px' }}
                onClick={() => !loading && !runningSteps && initScenario(s.value)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div className="scenario-card-icon" style={{ width: '38px', height: '38px', marginBottom: 0, borderRadius: '10px' }}>
                    <IconComp size={20} />
                  </div>
                  <span className="status-badge idle" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {s.difficulty}
                  </span>
                </div>
                <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>{s.label}</h3>
                <p style={{ fontSize: '12px', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            )
          })}
        </div>

        {/* ACTIVE SCENARIO CONTROL & TELEMETRY */}
        {state && (
          <div className="clay-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="clay-card-title" style={{ margin: 0 }}>
                <span className="clay-card-title-dot"></span>
                Active: {selectedScenarioInfo?.label}
              </div>
              <span className="status-badge listening" style={{ fontSize: '11px', padding: '3px 10px' }}>
                Step #{state.step ?? 0} ({(state.mission_time ?? 0).toFixed(1)}s)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleRun(50)}
                disabled={runningSteps || loading}
              >
                {runningSteps ? <span className="loading-spinner-sm"></span> : null}
                Run 50 Steps
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleRun(100)}
                disabled={runningSteps || loading}
              >
                Run 100 Steps
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleRun(200)}
                disabled={runningSteps || loading}
              >
                Run 200 Steps
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => initScenario(selected)}
                disabled={runningSteps || loading}
              >
                ↺ Reset
              </button>
            </div>

            <div className="metrics-grid" style={{ marginBottom: '18px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="metric-tile accent" style={{ padding: '12px' }}>
                <div className="metric-tile-value" style={{ fontSize: '22px' }}>{state.metrics?.total_dwells ?? 0}</div>
                <div className="metric-tile-label">Total Dwells</div>
              </div>
              <div className="metric-tile teal" style={{ padding: '12px' }}>
                <div className="metric-tile-value" style={{ fontSize: '22px' }}>{state.metrics?.hits ?? 0}</div>
                <div className="metric-tile-label">Emitter Intercepts</div>
              </div>
              <div className="metric-tile coral" style={{ padding: '12px' }}>
                <div className="metric-tile-value" style={{ fontSize: '22px' }}>{state.metrics?.false_alarms ?? 0}</div>
                <div className="metric-tile-label">False Alarms</div>
              </div>
              <div className="metric-tile green" style={{ padding: '12px' }}>
                <div className="metric-tile-value" style={{ fontSize: '22px' }}>
                  {((state.metrics?.prediction_accuracy ?? 0) * 100).toFixed(0)}%
                </div>
                <div className="metric-tile-label">Prediction Accuracy</div>
              </div>
            </div>

            {state.events && state.events.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div className="clay-card-title" style={{ marginBottom: '10px' }}>
                  <span className="clay-card-title-dot" style={{ background: 'var(--coral)' }}></span>
                  Scenario Event Timeline
                </div>
                <div className="event-timeline" style={{ maxHeight: '180px' }}>
                  {[...state.events].reverse().slice(0, 10).map((e, i) => (
                    <div key={e.id || `${e.time}-${i}`} className={`event-item ${e.type}`} style={{ padding: '8px 10px', gap: '8px' }}>
                      <div className="event-item-icon" style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EventIcon type={e.type} size={13} />
                      </div>
                      <div className="event-item-content">
                        <div className="event-item-time" style={{ fontSize: '10px' }}>T+{(e.time ?? 0).toFixed(1)}s</div>
                        <div className="event-item-message" style={{ fontSize: '11px' }}>{e.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '18px', textAlign: 'center' }}>
              <Link to="/dashboard" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                Open Scenario in Live Ops Console →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
