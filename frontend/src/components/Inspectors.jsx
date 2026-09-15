import { useState, useEffect, useCallback, useMemo } from 'react'
import * as api from '../api/client.js'
import {
  BrainChipIcon,
  TargetIcon,
  RadarIcon,
  SignalWaveIcon,
  ClockIcon,
  ActivityIcon,
  ShieldAlertIcon,
  CompassIcon,
  LayersIcon,
} from './Icons.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function Inspectors() {
  const { currentAccent, isDark } = useTheme()
  const [tab, setTab] = useState('receiver') // 'receiver' | 'scheduler' | 'belief' | 'emitters'
  const [tech, setTech] = useState(null)
  const [emitter, setEmitter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true)
    setError(null)
    try {
      const [t, e] = await Promise.all([
        api.getTechnicalInspector(),
        api.getEmitterInspector(),
      ])
      setTech(t)
      setEmitter(e)
    } catch (err) {
      console.error('Inspector error:', err)
      setError(err.message || 'Failed to fetch telemetry registers.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      load(true)
    }, 2000)
    return () => clearInterval(timer)
  }, [autoRefresh, load])

  const receiver = tech?.receiver || {}
  const detection = tech?.detection || {}
  const metrics = tech?.metrics || {}
  const schedulerWeights = tech?.scheduler_weights || {}
  const belief = tech?.belief || []
  const prediction = tech?.prediction || []
  const emittersList = emitter?.emitters || []
  const futureTruth = emitter?.analyst_view?.future_ground_truth || []

  // Compute detection outcome distribution percentages
  const totalObs = (metrics.hits || 0) + (metrics.misses || 0) + (metrics.false_alarms || 0) + (metrics.missed_detections || 0)
  const hitPct = totalObs > 0 ? ((metrics.hits || 0) / totalObs) * 100 : 0
  const faPct = totalObs > 0 ? ((metrics.false_alarms || 0) / totalObs) * 100 : 0
  const missPct = totalObs > 0 ? ((metrics.misses || 0) / totalObs) * 100 : 100
  const missedPct = totalObs > 0 ? ((metrics.missed_detections || 0) / totalObs) * 100 : 0

  // Tuner needle angle for 2000 - 3000 MHz (0 to 180 deg)
  const centerFreq = receiver.center_frequency ?? 2000
  const tunerAngle = Math.max(0, Math.min(180, ((centerFreq - 2000) / 1000) * 180))

  return (
    <div className="page animate-fadeIn">
      {/* HEADER BAR */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="page-title">
            <BrainChipIcon size={24} style={{ color: 'var(--accent)' }} />
            <span>Subsystem Telemetry & Emitter Inspector</span>
          </h1>
          <p className="page-subtitle">
            Diagnostics console for heterodyne receiver LO, Bayesian belief states, scheduler weights, and isolated ground truth
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <span>Live Auto-Poll (2s)</span>
          </label>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => load()}
            disabled={refreshing}
          >
            {refreshing ? <span className="loading-spinner-sm"></span> : null}
            ↻ Refresh Telemetry
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-banner-content">
            <span className="error-banner-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button className="btn btn-primary btn-xs" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      {/* SUBSYSTEM NAVIGATION TABS */}
      <div className="dashboard-controls" style={{ padding: '8px 12px', marginBottom: '20px' }}>
        <div className="inspector-tab-strip">
          <button
            className={`inspector-tab-btn ${tab === 'receiver' ? 'active' : ''}`}
            onClick={() => setTab('receiver')}
          >
            <RadarIcon size={16} />
            <span>Receiver & Detection</span>
          </button>
          <button
            className={`inspector-tab-btn ${tab === 'scheduler' ? 'active' : ''}`}
            onClick={() => setTab('scheduler')}
          >
            <CompassIcon size={16} />
            <span>Scheduler Weights</span>
          </button>
          <button
            className={`inspector-tab-btn ${tab === 'belief' ? 'active' : ''}`}
            onClick={() => setTab('belief')}
          >
            <BrainChipIcon size={16} />
            <span>Belief & Prediction Matrix</span>
          </button>
          <button
            className={`inspector-tab-btn ${tab === 'emitters' ? 'active' : ''}`}
            onClick={() => setTab('emitters')}
          >
            <TargetIcon size={16} />
            <span>Emitter Intel & Analyst View</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="clay-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div className="loading-spinner"></div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Polling diagnostic bus & register dumps...
          </p>
        </div>
      )}

      {/* TAB 1: RECEIVER & DETECTION SUBSYSTEMS */}
      {!loading && tab === 'receiver' && tech && (
        <div className="dashboard-c2-layout">
          {/* Receiver Subsystem Card with Visual Dial */}
          <div className="clay-card">
            <div className="clay-card-title">
              <span className="clay-card-title-dot"></span>
              Heterodyne Synthesizer & Tuner Telemetry
            </div>

            {/* Visual Semi-Circular Tuner Dial */}
            <div className="tuner-gauge-box">
              <svg width="240" height="130" viewBox="0 0 240 130">
                <defs>
                  <linearGradient id="tunerArc" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                {/* Dial Arc */}
                <path
                  d="M 20 120 A 100 100 0 0 1 220 120"
                  fill="none"
                  stroke="var(--bg-base)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 20 120 A 100 100 0 0 1 220 120"
                  fill="none"
                  stroke="url(#tunerArc)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeOpacity="0.75"
                />
                {/* Needle */}
                <g transform={`rotate(${tunerAngle - 90}, 120, 120)`}>
                  <line x1="120" y1="120" x2="120" y2="30" stroke="var(--coral)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="120" cy="120" r="8" fill="var(--coral)" />
                  <circle cx="120" cy="120" r="4" fill="#ffffff" />
                </g>
              </svg>

              <div style={{ textAlign: 'center', marginTop: '-10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                  {centerFreq.toFixed(1)} MHz
                </span>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Tuned LO: Band #{receiver.current_band ?? 0} (IBW {receiver.instantaneous_bandwidth ?? 100} MHz)
                </div>
              </div>

              <div className="tuner-freq-scale">
                <span>2000 MHz (B0)</span>
                <span>2500 MHz (B5)</span>
                <span>3000 MHz (B9)</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="inspector-row">
                <span className="inspector-key">Receiver Status</span>
                <span className="status-badge hit" style={{ fontSize: '11px' }}>
                  <span className="status-badge-dot"></span>
                  {(receiver.status || 'ACTIVE').toUpperCase()}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Dwell Duration</span>
                <span className="inspector-value">{receiver.dwell_duration ?? 0.5}s</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Observation State</span>
                <span className={`status-badge ${receiver.detection || 'idle'}`}>
                  <span className="status-badge-dot"></span>
                  {(receiver.detection || 'IDLE').toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Detection Confidence</span>
                <span className="inspector-value">{((receiver.confidence ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Cumulative Dwell Steps</span>
                <span className="inspector-value">{receiver.steps ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Detection Performance & Ratio Breakdown */}
          <div className="clay-card">
            <div className="clay-card-title">
              <span className="clay-card-title-dot" style={{ background: 'var(--coral)' }}></span>
              Energy Detector & False Alarm Probability
            </div>

            {/* Visual Outcome Distribution Ratio Bar */}
            <div>
              <span className="inspector-key">Detection Outcome Proportion ({totalObs} observations):</span>
              <div className="signal-ratio-bar">
                <div className="signal-ratio-segment hit" style={{ width: `${hitPct}%` }} title={`Hits: ${metrics.hits} (${hitPct.toFixed(1)}%)`} />
                <div className="signal-ratio-segment fa" style={{ width: `${faPct}%` }} title={`False Alarms: ${metrics.false_alarms} (${faPct.toFixed(1)}%)`} />
                <div className="signal-ratio-segment missed" style={{ width: `${missedPct}%` }} title={`Missed Targets: ${metrics.missed_detections} (${missedPct.toFixed(1)}%)`} />
                <div className="signal-ratio-segment miss" style={{ width: `${missPct}%` }} title={`Quiet Channel Misses: ${metrics.misses} (${missPct.toFixed(1)}%)`} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>● Hits ({metrics.hits ?? 0})</span>
                <span style={{ color: 'var(--coral)', fontWeight: 700 }}>● False Alarms ({metrics.false_alarms ?? 0})</span>
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>● Missed Opp. ({metrics.missed_detections ?? 0})</span>
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>● Misses ({metrics.misses ?? 0})</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div className="inspector-row">
                <span className="inspector-key">Design Pfa Specification</span>
                <span className="inspector-value">{((detection.false_alarm_rate ?? 0.05) * 100).toFixed(2)}%</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Empirical False Alarm Rate</span>
                <span className="inspector-value" style={{ color: faPct > 10 ? 'var(--coral)' : 'var(--green)' }}>
                  {((metrics.false_alarm_rate ?? 0) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Empirical PoD (Probability of Detection)</span>
                <span className="inspector-value" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                  {((metrics.probability_of_detection ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Average Intercept Latency</span>
                <span className="inspector-value">{(metrics.average_intercept_time ?? 0).toFixed(2)}s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COGNITIVE SCHEDULER WEIGHTS */}
      {!loading && tab === 'scheduler' && tech && (
        <div className="dashboard-c2-layout">
          {/* Multi-Attribute Utility Weights Card */}
          <div className="clay-card">
            <div className="clay-card-title">
              <span className="clay-card-title-dot" style={{ background: 'var(--accent)' }}></span>
              Multi-Attribute Decision Equalizer (FR-08)
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Candidate score formula: <code style={{ background: 'var(--bg-soft)', padding: '2px 6px', borderRadius: '4px' }}>Score = w_pred × P + w_rec × R + w_per × T + w_exp × E</code>
            </p>

            {schedulerWeights.weights ? (
              <div className="equalizer-grid">
                {Object.entries(schedulerWeights.weights).map(([term, weight]) => {
                  const pct = Math.min(100, Math.max(10, (weight ?? 0) * 100))
                  return (
                    <div key={term} className="equalizer-col">
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {((weight ?? 0) * 100).toFixed(0)}%
                      </span>
                      <div className="equalizer-track">
                        <div className="equalizer-fill" style={{ height: `${pct}%` }} />
                      </div>
                      <span className="equalizer-label">{term}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">No dynamic weights configured for active strategy.</div>
            )}

            <div style={{ marginTop: '16px' }}>
              <div className="inspector-row">
                <span className="inspector-key">Active Scheduler Strategy</span>
                <span className="inspector-value" style={{ textTransform: 'capitalize', color: 'var(--accent)', fontWeight: 800 }}>
                  {schedulerWeights.name || 'shravan'}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Cumulative Avg Reward</span>
                <span className="inspector-value" style={{ color: 'var(--green)', fontWeight: 800 }}>
                  {(metrics.average_reward ?? 0).toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* Dwell Allocation by Band Histogram */}
          <div className="clay-card">
            <div className="clay-card-title">
              <span className="clay-card-title-dot" style={{ background: 'var(--teal)' }}></span>
              Frequency Channel Visit Allocation
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Tracks visit counts across all 10 bands to balance exploitation of active emitters against exploration of quiet bands.
            </p>

            {schedulerWeights.visit_counts && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {schedulerWeights.visit_counts.map((count, b) => {
                  const maxVisits = Math.max(1, ...schedulerWeights.visit_counts)
                  const barWidth = ((count ?? 0) / maxVisits) * 100
                  const isCurrent = receiver.current_band === b
                  return (
                    <div key={b} className="belief-bar-row">
                      <span className="belief-bar-label" style={{ color: isCurrent ? 'var(--accent)' : 'inherit', fontWeight: 700 }}>
                        {isCurrent ? '▶ ' : ''}B{b} ({2000 + b * 100}M)
                      </span>
                      <div className="belief-bar-track">
                        <div
                          className="belief-bar-fill"
                          style={{ width: `${barWidth}%`, background: isCurrent ? 'var(--accent)' : undefined }}
                        />
                      </div>
                      <span className="belief-bar-value">{count} dwells</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BELIEF & PREDICTION MATRIX */}
      {!loading && tab === 'belief' && tech && (
        <div className="clay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="clay-card-title" style={{ margin: 0 }}>
              <span className="clay-card-title-dot"></span>
              Per-Band Posterior Belief & Prediction Telemetry (10 Channels)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Updated recursively after each 0.5s dwell
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Center Freq</th>
                  <th>Posterior Belief</th>
                  <th>Total Dwells</th>
                  <th>Hits / Miss / FA</th>
                  <th>Estimated Period</th>
                  <th>Next Opportunity</th>
                  <th>Prediction Conf.</th>
                </tr>
              </thead>
              <tbody>
                {belief.map((b) => {
                  const pred = prediction.find((p) => p.band === b.band) || {}
                  const isTuned = receiver.current_band === b.band
                  return (
                    <tr key={b.band} style={{ background: isTuned ? 'var(--accent-glow)' : undefined }}>
                      <td style={{ fontWeight: 800, color: isTuned ? 'var(--accent)' : 'inherit' }}>
                        {isTuned ? '▶ ' : ''}Band #{b.band}
                      </td>
                      <td>{2000 + b.band * 100} MHz</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="belief-bar-track" style={{ width: '80px' }}>
                            <div
                              className="belief-bar-fill"
                              style={{
                                width: `${(b.belief ?? 0) * 100}%`,
                                background: (b.belief ?? 0) > 0.5 ? 'var(--green)' : undefined,
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {(b.belief ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td>{b.num_observations ?? 0}</td>
                      <td>
                        <span style={{ color: 'var(--green)', fontWeight: 700 }}>{b.hits ?? 0}</span> /{' '}
                        <span>{b.misses ?? 0}</span> /{' '}
                        <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{b.false_alarms ?? 0}</span>
                      </td>
                      <td>{(b.estimated_period ?? 0) > 0 ? `${(b.estimated_period ?? 0).toFixed(1)}s` : '—'}</td>
                      <td>{pred.has_prediction ? `T+${(pred.next_event_time ?? 0).toFixed(1)}s` : 'No rhythm'}</td>
                      <td>
                        <span className={`prediction-conf ${pred.confidence > 0.5 ? 'high' : pred.confidence > 0.2 ? 'med' : 'low'}`}>
                          {pred.has_prediction ? `${((pred.confidence ?? 0) * 100).toFixed(0)}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EMITTER INTEL & ANALYST VIEW */}
      {!loading && tab === 'emitters' && emitter && (
        <div>
          {/* Emitter Intel Cards */}
          <div className="clay-card" style={{ marginBottom: '20px' }}>
            <div className="clay-card-title">
              <span className="clay-card-title-dot"></span>
              Emitter Parameter Ledger & Learned Cognitive Signatures ({emittersList.length} Active Targets)
            </div>

            <div className="emitter-card-grid">
              {emittersList.map((e) => {
                const hasLock = (e.learned_belief ?? 0) > 0.4
                return (
                  <div key={e.id} className="emitter-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="feature-card-icon accent" style={{ width: '32px', height: '32px', borderRadius: '8px', margin: 0 }}>
                          <SignalWaveIcon size={16} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Target {e.id}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {(e.type || '').replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>

                      <span className={`status-badge ${hasLock ? 'hit' : 'idle'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {hasLock ? 'LOCKED' : 'TRACKING'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div className="inspector-row" style={{ padding: '4px 0' }}>
                        <span className="inspector-key">Home Frequency</span>
                        <span style={{ fontWeight: 700 }}>Band #{e.home_band} ({2000 + e.home_band * 100} MHz)</span>
                      </div>
                      <div className="inspector-row" style={{ padding: '4px 0' }}>
                        <span className="inspector-key">Pulse Interval (PRI)</span>
                        <span style={{ fontWeight: 700 }}>{(e.period ?? 0).toFixed(1)}s (Duty {((e.duty_cycle ?? 0) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="inspector-row" style={{ padding: '4px 0' }}>
                        <span className="inspector-key">Learned Rhythm</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {(e.learned_period ?? 0) > 0 ? `${(e.learned_period ?? 0).toFixed(1)}s` : 'Analyzing...'}
                        </span>
                      </div>
                      <div className="inspector-row" style={{ padding: '4px 0' }}>
                        <span className="inspector-key">Predicted Next Arrival</span>
                        <span style={{ fontWeight: 700 }}>
                          {e.predicted_next_event !== null && e.predicted_next_event !== undefined
                            ? `T+${(e.predicted_next_event ?? 0).toFixed(1)}s (${((e.prediction_confidence ?? 0) * 100).toFixed(0)}% conf)`
                            : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Analyst View - Ground Truth Horizon */}
          <div className="clay-card" style={{ borderLeft: '4px solid var(--coral)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div className="clay-card-title" style={{ margin: 0 }}>
                <span className="clay-card-title-dot" style={{ background: 'var(--coral)' }}></span>
                Analyst View — Future Ground-Truth Transmission Horizon
              </div>
              <span className="status-badge fa" style={{ fontSize: '10px' }}>
                ISOLATED FROM SCHEDULER (VALIDATION ONLY)
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Ground-truth emitter pulses occurring over the next 50 seconds. Used strictly by analysts to assess scheduler convergence without contaminating the decision loop.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
              {futureTruth.slice(0, 24).map((f, i) => (
                <div key={i} className="event-item" style={{ padding: '8px 12px', gap: '10px' }}>
                  <div className="event-item-icon" style={{ width: '28px', height: '28px', fontSize: '12px', background: 'var(--surface)', border: '1px solid var(--coral-soft)' }}>
                    <TargetIcon size={14} style={{ color: 'var(--coral)' }} />
                  </div>
                  <div className="event-item-content">
                    <div className="event-item-time" style={{ fontSize: '10px', color: 'var(--coral)', fontWeight: 800 }}>
                      T+{(f.time ?? 0).toFixed(1)}s
                    </div>
                    <div className="event-item-message" style={{ fontSize: '12px', marginTop: 0 }}>
                      Target <strong>{f.emitter_id}</strong> on <strong>Band #{f.band}</strong> ({2000 + f.band * 100} MHz)
                    </div>
                  </div>
                </div>
              ))}
              {futureTruth.length === 0 && (
                <div className="empty-state">No future emitter events in window.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
