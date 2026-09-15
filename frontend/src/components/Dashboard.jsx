import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import * as api from '../api/client.js'
import { useTheme } from '../context/ThemeContext.jsx'
import RadarScope from './RadarScope.jsx'
import CustomSelect from './CustomSelect.jsx'
import {
  RadarIcon,
  SignalWaveIcon,
  TargetIcon,
  BrainChipIcon,
  ShieldAlertIcon,
  ActivityIcon,
  ClockIcon,
  CompassIcon,
  EventIcon,
} from './Icons.jsx'

const SCENARIOS = [
  { value: 'cold_start', label: 'Cold Start', icon: CompassIcon, desc: 'No prior intelligence — explore from scratch' },
  { value: 'periodic', label: 'Periodic Emitter', icon: ClockIcon, desc: 'Regular pulse intervals & recurrence' },
  { value: 'frequency_agile', label: 'Frequency Agile', icon: SignalWaveIcon, desc: 'Hops dynamically between bands' },
  { value: 'spatially_scanning', label: 'Spatially Scanning', icon: RadarIcon, desc: 'Sweeps sequentially across channels' },
  { value: 'multiple_emitters', label: 'Multiple Emitters', icon: TargetIcon, desc: 'Four concurrent emitter signals' },
  { value: 'sudden_threat', label: 'Sudden Threat', icon: ShieldAlertIcon, desc: 'High-priority emitter appears mid-mission' },
  { value: 'dynamic_environment', label: 'Dynamic Environment', icon: ActivityIcon, desc: 'Emitter switches channels & pulse rates' },
]

export default function Dashboard() {
  const { currentAccent, isDark } = useTheme()
  const [state, setState] = useState(null)
  const [scenario, setScenario] = useState('cold_start')
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)

  const wsClientRef = useRef(null)

  // Initialize simulation cleanly
  const loadScenario = useCallback(async (targetScenario) => {
    setLoading(true)
    setError(null)
    try {
      if (running) {
        await api.stopAutoRun().catch(() => {})
        setRunning(false)
      }
      const s = await api.initSim({ scenario: targetScenario, num_bands: 10, seed: 42 })
      setState(s)
    } catch (err) {
      console.error('Failed to initialize simulation:', err)
      setError(err.message || 'Unable to connect to backend simulation.')
    } finally {
      setLoading(false)
    }
  }, [running])

  // Initial load
  useEffect(() => {
    loadScenario(scenario)
  }, []) // mount only

  // Resilient WebSocket connection
  useEffect(() => {
    const wsClient = api.connectWebSocket({
      onMessage: (msg) => {
        if (msg && msg.scenario) {
          setState(msg)
          if (msg.running !== undefined) {
            setRunning(msg.running)
          }
        }
      },
      onOpen: () => {
        setWsConnected(true)
        setError(null)
      },
      onClose: () => {
        setWsConnected(false)
      },
      onError: () => {
        setWsConnected(false)
      },
    })

    wsClientRef.current = wsClient

    return () => {
      wsClient.close()
    }
  }, [])

  const handleStep = async (steps = 1) => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const s = await api.stepSim(steps)
      setState(s)
    } catch (err) {
      setError(`Step execution failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async (steps = 50) => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const s = await api.runSim(steps)
      setState(s)
    } catch (err) {
      setError(`Run batch failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setError(null)
    try {
      await api.startAutoRun()
      setRunning(true)
    } catch (err) {
      setError(`Failed to start auto-run: ${err.message}`)
    }
  }

  const handleStop = async () => {
    setError(null)
    try {
      await api.stopAutoRun()
      setRunning(false)
    } catch (err) {
      setError(`Failed to stop auto-run: ${err.message}`)
    }
  }

  const handleReset = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      if (running) {
        await handleStop()
      }
      const s = await api.resetSim({ scenario })
      setState(s)
    } catch (err) {
      setError(`Reset failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleScenarioChange = async (valOrEvent) => {
    const val = typeof valOrEvent === 'string' ? valOrEvent : valOrEvent?.target?.value
    if (!val) return
    setScenario(val)
    await loadScenario(val)
  }

  if (!state && loading) {
    return (
      <div className="page">
        <div className="clay-card" style={{ maxWidth: '440px', margin: '80px auto', textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <h3 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Initializing Tactical Telemetry</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
            Allocating RF channels & belief matrix...
          </p>
        </div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="page">
        <div className="clay-card" style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center', borderLeft: '4px solid var(--coral)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Simulation Connection Error</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            {error}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => loadScenario(scenario)}>
            ↻ Retry Connection
          </button>
        </div>
      </div>
    )
  }

  const numBands = state?.num_bands || 10
  const receiver = state?.receiver || {}
  const metrics = state?.metrics || {}
  const belief = state?.belief || []
  const prediction = state?.prediction || []
  const events = state?.events || []
  const schedulerDecision = state?.scheduler?.decision || {}
  const activePredictions = prediction.filter((p) => p.has_prediction)

  const pod = ((metrics.probability_of_detection ?? 0) * 100).toFixed(1)
  const interceptRate = ((metrics.interception_rate ?? 0) * 100).toFixed(1)
  const far = ((metrics.false_alarm_rate ?? 0) * 100).toFixed(2)
  const predAcc = ((metrics.prediction_accuracy ?? 0) * 100).toFixed(0)
  const avgReward = (metrics.average_reward ?? 0).toFixed(3)
  const dwells = metrics.total_dwells ?? 0

  return (
    <div className="page animate-fadeIn">
      {/* HEADER BAR */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">
            <RadarIcon size={24} style={{ color: 'var(--accent)' }} />
            <span>Live Operations Console</span>
            {running && (
              <span className="status-badge hit" style={{ fontSize: '11px', padding: '3px 10px' }}>
                <span className="status-badge-dot"></span>
                ACTIVE EW SCAN
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Mission Time: <strong style={{ color: 'var(--text-primary)' }}>{(state?.mission_time ?? 0).toFixed(1)}s</strong> · Step #{state?.step ?? 0} · Scenario: <strong style={{ color: 'var(--accent)' }}>{state?.scenario ?? scenario}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`status-badge ${wsConnected ? 'hit' : 'idle'}`} style={{ fontSize: '11px' }}>
            <span className="status-badge-dot"></span>
            {wsConnected ? 'Live Sensor Link' : 'Polling Fallback'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-banner-content">
            <span className="error-banner-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-xs" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* COMPACT METRICS STRIP */}
      <div className="metrics-strip">
        <div className="metric-strip-card">
          <div className="metric-strip-icon accent">
            <TargetIcon size={18} />
          </div>
          <div className="metric-strip-info">
            <span className="metric-strip-val">{pod}%</span>
            <span className="metric-strip-lbl">Prob. of Detection</span>
          </div>
        </div>

        <div className="metric-strip-card">
          <div className="metric-strip-icon teal">
            <ActivityIcon size={18} />
          </div>
          <div className="metric-strip-info">
            <span className="metric-strip-val">{interceptRate}%</span>
            <span className="metric-strip-lbl">Interception Rate</span>
          </div>
        </div>

        <div className="metric-strip-card">
          <div className="metric-strip-icon coral">
            <ShieldAlertIcon size={18} />
          </div>
          <div className="metric-strip-info">
            <span className="metric-strip-val">{far}%</span>
            <span className="metric-strip-lbl">False Alarm Rate</span>
          </div>
        </div>

        <div className="metric-strip-card">
          <div className="metric-strip-icon green">
            <BrainChipIcon size={18} />
          </div>
          <div className="metric-strip-info">
            <span className="metric-strip-val">{predAcc}%</span>
            <span className="metric-strip-lbl">Prediction Accuracy</span>
          </div>
        </div>

        <div className="metric-strip-card">
          <div className="metric-strip-icon amber">
            <SignalWaveIcon size={18} />
          </div>
          <div className="metric-strip-info">
            <span className="metric-strip-val">{avgReward}</span>
            <span className="metric-strip-lbl">Average Reward</span>
          </div>
        </div>

        <div className="metric-strip-card">
          <div className="metric-strip-icon accent">
            <ClockIcon size={18} />
          </div>
          <div className="metric-strip-info">
            <span className="metric-strip-val">{dwells}</span>
            <span className="metric-strip-lbl">Total Dwells</span>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="dashboard-controls">
        <CustomSelect
          label="Scenario:"
          value={scenario}
          onChange={handleScenarioChange}
          options={SCENARIOS}
          disabled={loading || running}
        />

        <div style={{ height: '22px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Dwell Stepping */}
        <div className="control-group">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleStep(1)}
            disabled={loading || running}
            title="Execute 1 Dwell Step"
          >
            Step +1
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleStep(5)}
            disabled={loading || running}
            title="Execute 5 Dwell Steps"
          >
            +5
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleRun(50)}
            disabled={loading || running}
            title="Run 50 Steps Batch"
          >
            Run 50
          </button>
        </div>

        {/* Auto Run */}
        {!running ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleStart}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, var(--green), #15803d)' }}
          >
            ▶ Auto Stream
          </button>
        ) : (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStop}
            style={{ color: 'var(--coral)', borderColor: 'var(--coral-soft)' }}
          >
            ⏸ Pause Stream
          </button>
        )}

        <button
          className="btn btn-ghost btn-sm"
          onClick={handleReset}
          disabled={loading}
        >
          ↺ Reset
        </button>

        {loading && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            <span className="loading-spinner-sm" style={{ borderTopColor: 'var(--accent)' }}></span>
            Executing Dwell...
          </span>
        )}
      </div>

      {/* HIGH-DENSITY WORKSTATION: 2-COLUMN TACTICAL HUD */}
      <div className="dashboard-c2-layout">
        {/* COLUMN 1: VISUAL SENSOR SUITE */}
        <div className="dashboard-col-visuals">
          {/* REAL RADAR SCOPE & FFT SPECTRUM ANALYZER */}
          <RadarScope state={state} accentColor={currentAccent.primary} isDark={isDark} />

          {/* RF ACTIVITY FREQUENCY × TIME MAP */}
          <div className="clay-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="clay-card-title" style={{ margin: 0 }}>
                <span className="clay-card-title-dot"></span>
                RF Activity — Frequency × Time Heatmap
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                10 Channels (2.0 – 3.0 GHz)
              </span>
            </div>
            <RFHeatmap state={state} numBands={numBands} accentColor={currentAccent.primary} isDark={isDark} />
          </div>
        </div>

        {/* COLUMN 2: INTELLIGENCE & DECISION SUITE */}
        <div className="dashboard-col-telemetry">
          {/* RECEIVER + SMART SCHEDULER */}
          <div className="clay-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Receiver LO State */}
              <div>
                <div className="clay-card-title" style={{ marginBottom: '10px' }}>
                  <span className="clay-card-title-dot" style={{ background: 'var(--teal)' }}></span>
                  Receiver Subsystem
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="inspector-row">
                    <span className="inspector-key">Tuned Channel</span>
                    <span className="inspector-value" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                      Band #{receiver.current_band ?? 0}
                    </span>
                  </div>
                  <div className="inspector-row">
                    <span className="inspector-key">Center Freq</span>
                    <span className="inspector-value">{(receiver.center_frequency ?? 2000).toFixed(1)} MHz</span>
                  </div>
                  <div className="inspector-row">
                    <span className="inspector-key">Bandwidth (IBW)</span>
                    <span className="inspector-value">{receiver.instantaneous_bandwidth ?? 100} MHz</span>
                  </div>
                  <div className="inspector-row">
                    <span className="inspector-key">Observation</span>
                    <span className={`status-badge ${receiver.detection || 'idle'}`}>
                      <span className="status-badge-dot"></span>
                      {(receiver.detection || 'IDLE').toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Smart Scheduler Rationale */}
              <div>
                <div className="clay-card-title" style={{ marginBottom: '10px' }}>
                  <span className="clay-card-title-dot" style={{ background: 'var(--accent)' }}></span>
                  Next Scheduling Choice
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="inspector-row">
                    <span className="inspector-key">Selected Band</span>
                    <span className="inspector-value" style={{ color: 'var(--accent-deep)', fontSize: '18px', fontWeight: 800 }}>
                      Band #{schedulerDecision.band ?? 0}
                    </span>
                  </div>
                  <div className="inspector-row">
                    <span className="inspector-key">Strategy</span>
                    <span className="inspector-value" style={{ textTransform: 'capitalize' }}>
                      {state?.scheduler?.name || 'shravan'}
                    </span>
                  </div>
                  <div className="why-this-band" style={{ padding: '8px 12px', fontSize: '12px' }}>
                    "{schedulerDecision.reason || 'Uniform scan prior to observations.'}"
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduler Component Scores */}
            {schedulerDecision.scores && Object.keys(schedulerDecision.scores).length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(128,128,128,0.15)' }}>
                <div className="scheduler-scores">
                  {Object.entries(schedulerDecision.scores).map(([key, val]) => (
                    <div key={key} className="scheduler-score-row">
                      <span className="scheduler-score-label" style={{ textTransform: 'capitalize' }}>{key}</span>
                      <div className="scheduler-score-track">
                        <div
                          className="scheduler-score-fill"
                          style={{ width: `${Math.min(100, (val ?? 0) * 100)}%` }}
                        />
                      </div>
                      <span className="scheduler-score-value">{(val ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PER-BAND BELIEF MATRIX */}
          <div className="clay-card">
            <div className="clay-card-title">
              <span className="clay-card-title-dot" style={{ background: 'var(--accent)' }}></span>
              Per-Band Posterior Belief Distribution
            </div>
            <div className="belief-grid">
              {belief.map((b) => {
                const bVal = b.belief ?? 0
                const level = bVal > 0.5 ? 'high' : bVal > 0.2 ? 'med' : 'low'
                const isTuned = receiver.current_band === b.band
                return (
                  <div key={b.band} className="belief-bar-row">
                    <span className="belief-bar-label" style={{ color: isTuned ? 'var(--accent)' : 'inherit' }}>
                      {isTuned ? '▶ ' : ''}Band #{b.band}
                    </span>
                    <div className="belief-bar-track">
                      <div className={`belief-bar-fill ${level}`} style={{ width: `${bVal * 100}%` }} />
                    </div>
                    <span className="belief-bar-value">{bVal.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PREDICTIONS & EVENT STREAM IN COMPACT SPLIT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Predicted Temporal Opportunities */}
            <div className="clay-card">
              <div className="clay-card-title">
                <span className="clay-card-title-dot" style={{ background: 'var(--green)' }}></span>
                Prediction Horizon
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {activePredictions.length === 0 ? (
                  <div className="empty-state" style={{ padding: '16px 8px', fontSize: '12px' }}>
                    Gathering dwell observations to infer repetition cycles...
                  </div>
                ) : (
                  activePredictions.map((p) => (
                    <div key={p.band} className="prediction-item" style={{ padding: '8px 10px' }}>
                      <div>
                        <div className="prediction-band" style={{ fontSize: '12px' }}>Band #{p.band}</div>
                        <div className="prediction-time" style={{ fontSize: '11px' }}>
                          Next: {(p.next_event_time ?? 0).toFixed(1)}s
                        </div>
                      </div>
                      <span className={`prediction-conf ${p.confidence > 0.5 ? 'high' : p.confidence > 0.2 ? 'med' : 'low'}`} style={{ fontSize: '11px' }}>
                        {((p.confidence ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Interception Log */}
            <div className="clay-card">
              <div className="clay-card-title">
                <span className="clay-card-title-dot" style={{ background: 'var(--coral)' }}></span>
                <span>Signal Intercepts Log</span>
              </div>
              <div className="event-timeline" style={{ maxHeight: '180px' }}>
                {events.length === 0 ? (
                  <div className="empty-state" style={{ padding: '16px 8px', fontSize: '12px' }}>
                    No emitter contacts recorded yet.
                  </div>
                ) : (
                  [...events].reverse().slice(0, 15).map((e, i) => (
                    <div key={e.id || `${e.time}-${e.type}-${i}`} className={`event-item ${e.type}`} style={{ padding: '8px 10px', gap: '8px' }}>
                      <div className="event-item-icon" style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EventIcon type={e.type} size={13} />
                      </div>
                      <div className="event-item-content">
                        <div className="event-item-time" style={{ fontSize: '10px' }}>T+{(e.time ?? 0).toFixed(1)}s</div>
                        <div className="event-item-message" style={{ fontSize: '11px' }}>{e.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RFHeatmap({ state, numBands, accentColor, isDark }) {
  const rfMap = state?.rf_map || []

  const { times, data } = useMemo(() => {
    const maxTime = rfMap.reduce((max, r) => Math.max(max, r.time || 0), 0) + 1
    const safeMax = Math.max(16, Math.ceil(maxTime))

    const timeBuckets = []
    for (let t = 0; t <= safeMax; t += 0.5) {
      timeBuckets.push(t.toFixed(1))
    }

    const pointMap = new Map()

    rfMap.forEach((row) => {
      const tIdx = Math.floor((row.time || 0) / 0.5)
      if (row.observed_band !== undefined) {
        const val = row.hit ? 2 : row.observation === 'false_alarm' ? 1 : 0
        pointMap.set(`${row.observed_band}_${tIdx}`, val)
      }
      if (row.active_bands) {
        row.active_bands.forEach((b) => {
          if (b !== row.observed_band || !row.hit) {
            const key = `${b}_${tIdx}`
            const current = pointMap.get(key)
            if (current === undefined || current < 3) {
              pointMap.set(key, 3)
            }
          }
        })
      }
    })

    const chartData = []
    pointMap.forEach((val, key) => {
      const [band, tIdx] = key.split('_').map(Number)
      chartData.push([band, tIdx, val])
    })

    return { times: timeBuckets, data: chartData }
  }, [rfMap])

  const bands = useMemo(
    () => Array.from({ length: numBands }, (_, i) => `B${i}`),
    [numBands]
  )

  const option = useMemo(() => {
    const textColor = isDark ? '#94a3b8' : '#475569'
    const splitColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'

    return {
      tooltip: {
        position: 'top',
        formatter: (p) => {
          const val = p.data[2]
          const label =
            val === 3
              ? 'Emitter Active (Ground Truth)'
              : val === 2
              ? 'Hit (Intercepted)'
              : val === 1
              ? 'False Alarm'
              : 'Miss (Quiet)'
          return `${bands[p.data[0]]} @ T+${times[p.data[1]]}s<br/><strong>${label}</strong>`
        },
      },
      grid: { top: 10, right: 15, bottom: 42, left: 45 },
      xAxis: {
        type: 'category',
        data: times,
        name: 'Time (s)',
        nameTextStyle: { color: textColor, fontSize: 10 },
        splitArea: { show: true, areaStyle: { color: [splitColor, 'transparent'] } },
        axisLabel: {
          color: textColor,
          fontSize: 9,
          interval: Math.max(1, Math.floor(times.length / 12)),
        },
      },
      yAxis: {
        type: 'category',
        data: bands,
        splitArea: { show: true, areaStyle: { color: [splitColor, 'transparent'] } },
        axisLabel: { color: textColor, fontSize: 10, fontWeight: 'bold' },
      },
      visualMap: {
        min: 0,
        max: 3,
        show: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: textColor, fontSize: 10 },
        pieces: [
          { value: 0, label: 'Miss', color: isDark ? '#334155' : '#cbd5e1' },
          { value: 1, label: 'False Alarm', color: '#f87171' },
          { value: 2, label: 'Hit', color: '#22c55e' },
          { value: 3, label: 'Active', color: accentColor || '#10b981' },
        ],
      },
      series: [
        {
          type: 'heatmap',
          data: data,
          emphasis: {
            itemStyle: {
              shadowBlur: 6,
              shadowColor: 'rgba(0, 0, 0, 0.4)',
            },
          },
        },
      ],
    }
  }, [times, bands, data, accentColor, isDark])

  return <ReactECharts option={option} style={{ height: '230px' }} notMerge={true} lazyUpdate={true} />
}
