import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import * as api from '../api/client.js'
import { useTheme } from '../context/ThemeContext.jsx'
import CustomSelect from './CustomSelect.jsx'
import {
  LayersIcon,
  CompassIcon,
  ClockIcon,
  SignalWaveIcon,
  RadarIcon,
  TargetIcon,
  ShieldAlertIcon,
  ActivityIcon,
} from './Icons.jsx'

const SCENARIOS = [
  { value: 'cold_start', label: 'Cold Start', icon: CompassIcon, desc: 'Explore from scratch' },
  { value: 'periodic', label: 'Periodic Emitter', icon: ClockIcon, desc: 'Regular pulse intervals' },
  { value: 'frequency_agile', label: 'Frequency Agile', icon: SignalWaveIcon, desc: 'Hops dynamically between bands' },
  { value: 'spatially_scanning', label: 'Spatially Scanning', icon: RadarIcon, desc: 'Sequential sweeping emitter' },
  { value: 'multiple_emitters', label: 'Multiple Emitters', icon: TargetIcon, desc: 'Four concurrent emitter signals' },
  { value: 'sudden_threat', label: 'Sudden Threat', icon: ShieldAlertIcon, desc: 'High-priority emitter appears mid-mission' },
  { value: 'dynamic_environment', label: 'Dynamic Environment', icon: ActivityIcon, desc: 'Switches channels & pulse rates' },
]

const STEP_OPTIONS = [
  { value: 100, label: '100 Steps', desc: 'Fast benchmark iteration' },
  { value: 200, label: '200 Steps (Standard)', desc: 'Balanced evaluation convergence' },
  { value: 300, label: '300 Steps', desc: 'Extended evaluation' },
  { value: 500, label: '500 Steps (Deep Stress)', desc: 'Long-horizon stress test' },
]

const METRIC_LABELS = {
  probability_of_detection: 'Probability of Detection',
  false_alarm_rate: 'False Alarm Rate',
  interception_rate: 'Interception Rate',
  average_intercept_time: 'Average Intercept Time',
  prediction_accuracy: 'Prediction Accuracy',
  average_reward: 'Average Reward',
}

export default function Benchmark() {
  const { currentAccent, isDark } = useTheme()
  const [scenario, setScenario] = useState('periodic')
  const [numSteps, setNumSteps] = useState(200)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.runBenchmark({
        scenario,
        num_bands: 10,
        seed: 42,
        num_steps: numSteps,
      })
      setResults(r)
    } catch (err) {
      console.error('Benchmark execution error:', err)
      setError(err.message || 'Benchmark execution failed. Please verify the backend service is reachable.')
    } finally {
      setLoading(false)
    }
  }

  const activeScenarioLabel = useMemo(() => {
    return SCENARIOS.find((s) => s.value === scenario)?.label || scenario
  }, [scenario])

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">
          <LayersIcon size={24} style={{ color: 'var(--accent)' }} />
          <span>Strategy Benchmark</span>
        </h1>
        <p className="page-subtitle">
          Compare Round Robin, Random, Greedy, and SHRAVAN under identical synthetic conditions
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-banner-content">
            <span className="error-banner-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button className="btn btn-primary btn-xs" onClick={handleRun}>
            Retry
          </button>
        </div>
      )}

      <div className="dashboard-controls">
        <CustomSelect
          label="Scenario:"
          value={scenario}
          onChange={(val) => setScenario(val)}
          options={SCENARIOS}
          disabled={loading}
        />

        <div style={{ height: '22px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        <CustomSelect
          label="Steps per Strategy:"
          value={numSteps}
          onChange={(val) => setNumSteps(Number(val))}
          options={STEP_OPTIONS}
          disabled={loading}
        />

        <button
          className="btn btn-primary btn-sm"
          onClick={handleRun}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading-spinner-sm"></span>
              Evaluating 4 Strategies...
            </>
          ) : (
            '▶ Execute Benchmark'
          )}
        </button>
      </div>

      {loading && (
        <div className="clay-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="loading-spinner"></div>
          <h3 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Simulating 4 Scan Strategies</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
            Running Round Robin, Random, Greedy, and SHRAVAN for {numSteps} dwells in {activeScenarioLabel}...
          </p>
        </div>
      )}

      {results && !loading && (
        <>
          {/* RESULTS TABLE */}
          <div className="clay-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="clay-card-title" style={{ margin: 0 }}>
                <span className="clay-card-title-dot"></span>
                Results Matrix — {SCENARIOS.find((s) => s.value === results.config?.scenario)?.label || results.config?.scenario} · {results.config?.num_steps} dwells per strategy
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Seed: {results.config?.seed}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>PoD</th>
                    <th>FAR</th>
                    <th>Interception Rate</th>
                    <th>Avg Intercept Time</th>
                    <th>Prediction Acc.</th>
                    <th>Avg Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {(results.results || []).map((r) => {
                    const best = results.summary?.best || {}
                    const isShravan = r.strategy === 'shravan'
                    return (
                      <tr key={r.strategy}>
                        <td className={`strategy-name ${isShravan ? 'strategy-shravan' : ''}`}>
                          {isShravan ? '⭐ SHRAVAN' : r.strategy.replace(/_/g, ' ')}
                        </td>
                        <td className={best.probability_of_detection === r.strategy ? 'best' : ''}>
                          {((r.probability_of_detection ?? 0) * 100).toFixed(1)}%
                        </td>
                        <td className={best.false_alarm_rate === r.strategy ? 'best' : ''}>
                          {((r.false_alarm_rate ?? 0) * 100).toFixed(2)}%
                        </td>
                        <td className={best.interception_rate === r.strategy ? 'best' : ''}>
                          {((r.interception_rate ?? 0) * 100).toFixed(1)}%
                        </td>
                        <td className={best.average_intercept_time === r.strategy ? 'best' : ''}>
                          {(r.average_intercept_time ?? 0).toFixed(2)}s
                        </td>
                        <td className={best.prediction_accuracy === r.strategy ? 'best' : ''}>
                          {((r.prediction_accuracy ?? 0) * 100).toFixed(0)}%
                        </td>
                        <td className={best.average_reward === r.strategy ? 'best' : ''}>
                          {(r.average_reward ?? 0).toFixed(3)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHARTS */}
          <div className="dashboard-grid-2">
            <div className="clay-card">
              <div className="clay-card-title">
                <span className="clay-card-title-dot" style={{ background: 'var(--accent)' }}></span>
                Detection Rate & Reward Comparison
              </div>
              <BenchmarkChart results={results} accentColor={currentAccent.primary} isDark={isDark} />
            </div>

            <div className="clay-card">
              <div className="clay-card-title">
                <span className="clay-card-title-dot" style={{ background: 'var(--teal)' }}></span>
                Multi-Metric Radar Signature
              </div>
              <BenchmarkRadar results={results} accentColor={currentAccent.primary} isDark={isDark} />
            </div>
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="clay-card empty-state" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--bg-soft)', color: 'var(--accent)', marginBottom: '16px', boxShadow: 'var(--shadow-neu-sm)' }}>
            <LayersIcon size={36} />
          </div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Benchmark Not Yet Run</h3>
          <p style={{ maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Execute a side-by-side trial of Round Robin, Random, Greedy, and the SHRAVAN adaptive scheduler across identical emitter patterns.
          </p>
          <button className="btn btn-primary" onClick={handleRun}>
            ▶ Run Periodic Benchmark (200 Steps)
          </button>
        </div>
      )}
    </div>
  )
}

function BenchmarkChart({ results, accentColor, isDark }) {
  const strategies = results?.strategies || []
  const textColor = isDark ? '#94a3b8' : '#475569'

  const strategyColorMap = {
    round_robin: '#8b5cf6',
    random: '#f43f5e',
    greedy: '#f59e0b',
    shravan: accentColor || '#10b981',
  }

  const option = useMemo(() => {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['PoD (%)', 'Avg Reward'], top: 0, textStyle: { color: textColor } },
      grid: { top: 40, right: 25, bottom: 30, left: 55 },
      xAxis: {
        type: 'category',
        data: strategies.map((s) => s.replace(/_/g, ' ')),
        axisLabel: { fontSize: 11, color: textColor, fontWeight: 'bold' },
      },
      yAxis: [
        {
          type: 'value',
          name: 'PoD (%)',
          max: 100,
          nameTextStyle: { color: textColor },
          axisLabel: { color: textColor },
        },
        {
          type: 'value',
          name: 'Reward',
          nameTextStyle: { color: textColor },
          axisLabel: { color: textColor },
        },
      ],
      series: [
        {
          name: 'PoD (%)',
          type: 'bar',
          data: strategies.map((s) => {
            const r = (results?.results || []).find((x) => x.strategy === s)
            return ((r?.probability_of_detection ?? 0) * 100).toFixed(1)
          }),
          itemStyle: {
            color: (params) => {
              const stratKey = strategies[params.dataIndex]
              return strategyColorMap[stratKey] || accentColor || '#10b981'
            },
            borderRadius: [6, 6, 0, 0],
          },
          barWidth: '32%',
        },
        {
          name: 'Avg Reward',
          type: 'line',
          yAxisIndex: 1,
          data: strategies.map((s) => {
            const r = (results?.results || []).find((x) => x.strategy === s)
            return (r?.average_reward ?? 0).toFixed(3)
          }),
          smooth: true,
          lineStyle: { width: 3, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    }
  }, [results, strategies, accentColor, textColor])

  return <ReactECharts option={option} style={{ height: '320px' }} notMerge={true} />
}

function BenchmarkRadar({ results, accentColor, isDark }) {
  const strategies = results?.strategies || []
  const metrics = ['probability_of_detection', 'interception_rate', 'prediction_accuracy', 'average_reward']
  const textColor = isDark ? '#94a3b8' : '#475569'

  const strategyColorMap = {
    round_robin: '#8b5cf6',
    random: '#f43f5e',
    greedy: '#f59e0b',
    shravan: accentColor || '#10b981',
  }

  const option = useMemo(() => {
    return {
      tooltip: {},
      legend: {
        data: strategies.map((s) => s.replace(/_/g, ' ')),
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      radar: {
        indicator: metrics.map((m) => ({
          name: METRIC_LABELS[m].split(' ')[0],
          max: 1,
          color: textColor,
        })),
        radius: '65%',
        axisName: { color: textColor, fontWeight: 'bold' },
      },
      series: [
        {
          type: 'radar',
          data: strategies.map((s) => {
            const r = (results?.results || []).find((x) => x.strategy === s)
            const color = strategyColorMap[s] || accentColor || '#10b981'
            return {
              value: metrics.map((m) => Math.max(0, Math.min(1, r?.[m] ?? 0))),
              name: s.replace(/_/g, ' '),
              lineStyle: { color, width: 2.5 },
              areaStyle: { color, opacity: 0.15 },
              itemStyle: { color },
            }
          }),
        },
      ],
    }
  }, [results, strategies, accentColor, textColor])

  return <ReactECharts option={option} style={{ height: '320px' }} notMerge={true} />
}
