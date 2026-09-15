import { useState, useEffect, useRef } from 'react'
import { RadarIcon, SignalWaveIcon, TargetIcon, ActivityIcon } from './Icons.jsx'

export default function RadarScope({ state, accentColor = '#10b981', isDark = false }) {
  const [viewMode, setViewMode] = useState('radar') // 'radar' | 'spectrum'
  const [sweepAngle, setSweepAngle] = useState(0)
  const animFrameRef = useRef(null)

  const numBands = state?.num_bands || 10
  const receiver = state?.receiver || {}
  const currentBand = receiver.current_band ?? 0
  const detection = receiver.detection || 'idle'
  const confidence = receiver.confidence ?? 0
  const isRunning = state?.running ?? false
  const belief = state?.belief || []
  const emitters = state?.emitter_metadata || []

  // Smooth continuous radar sweep animation
  useEffect(() => {
    let lastTime = performance.now()
    const speed = isRunning ? 0.12 : 0.04 // degrees per ms

    const loop = (now) => {
      const delta = now - lastTime
      lastTime = now
      setSweepAngle((prev) => (prev + delta * speed) % 360)
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isRunning])

  // Compute radial band positions (0 to 360 deg)
  const bandNodes = Array.from({ length: numBands }, (_, i) => {
    const angleDeg = (i / numBands) * 360 - 90
    const angleRad = (angleDeg * Math.PI) / 180
    const radius = 105 // px from center (scope radius is ~135px)
    const x = 140 + radius * Math.cos(angleRad)
    const y = 140 + radius * Math.sin(angleRad)
    const bData = belief.find((b) => b.band === i)
    const bVal = bData?.belief ?? 0
    const isCurrent = currentBand === i
    const hasActiveEmitter = emitters.some((e) => e.home_band === i)

    return {
      band: i,
      x,
      y,
      angleDeg,
      bVal,
      isCurrent,
      hasActiveEmitter,
      freq: 2000 + i * 100,
    }
  })

  // Simulated RF spectrum FFT data for all 10 bands
  const spectrumPoints = Array.from({ length: numBands }, (_, i) => {
    const isTuned = currentBand === i
    const bData = belief.find((b) => b.band === i)
    const bVal = bData?.belief ?? 0
    let powerDbm = -92 // base noise floor
    if (isTuned && detection === 'hit') {
      powerDbm = -35 + Math.random() * 6
    } else if (isTuned && detection === 'false_alarm') {
      powerDbm = -65 + Math.random() * 8
    } else if (bVal > 0.3) {
      powerDbm = -85 + bVal * 25 + (Math.random() * 4 - 2)
    } else {
      powerDbm += Math.random() * 5 - 2.5
    }
    return { band: i, freq: 2000 + i * 100, powerDbm, isTuned }
  })

  const sweepRad = (sweepAngle * Math.PI) / 180
  const sweepX = 140 + 130 * Math.cos(sweepRad)
  const sweepY = 140 + 130 * Math.sin(sweepRad)

  return (
    <div className="radar-simulator-container">
      {/* Header with visual mode toggles */}
      <div className="radar-simulator-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="radar-live-beacon"></span>
          <span style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>
            TACTICAL RF SPECTRUM MONITOR
          </span>
          <span className={`status-badge ${detection}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
            {detection.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <div className="btn-group">
          <button
            className={`btn-group-item ${viewMode === 'radar' ? 'active' : ''}`}
            onClick={() => setViewMode('radar')}
          >
            <RadarIcon size={14} /> PPI Scope
          </button>
          <button
            className={`btn-group-item ${viewMode === 'spectrum' ? 'active' : ''}`}
            onClick={() => setViewMode('spectrum')}
          >
            <SignalWaveIcon size={14} /> FFT Spectrum
          </button>
        </div>
      </div>

      <div className="radar-display-body">
        {viewMode === 'radar' ? (
          <div className="radar-scope-wrapper">
            <svg width="280" height="280" viewBox="0 0 280 280" className="radar-svg">
              <defs>
                <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={isDark ? '#09151e' : '#e6eff5'} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={isDark ? '#04090e' : '#d2dfeb'} stopOpacity="1" />
                </radialGradient>
                <linearGradient id="beamGradient" x1="140" y1="140" x2={sweepX} y2={sweepY} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Background scope glass */}
              <circle cx="140" cy="140" r="135" fill="url(#radarBg)" stroke={accentColor} strokeWidth="2" strokeOpacity="0.6" />

              {/* Range rings */}
              <circle cx="140" cy="140" r="105" fill="none" stroke={accentColor} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" />
              <circle cx="140" cy="140" r="75" fill="none" stroke={accentColor} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" />
              <circle cx="140" cy="140" r="40" fill="none" stroke={accentColor} strokeWidth="1" strokeOpacity="0.3" />

              {/* Azimuth crosshairs */}
              <line x1="140" y1="5" x2="140" y2="275" stroke={accentColor} strokeWidth="1" strokeOpacity="0.25" />
              <line x1="5" y1="140" x2="275" y2="140" stroke={accentColor} strokeWidth="1" strokeOpacity="0.25" />

              {/* Compass degrees text */}
              <text x="140" y="18" fill={accentColor} fontSize="8" fontWeight="bold" textAnchor="middle" fillOpacity="0.6">000°</text>
              <text x="268" y="143" fill={accentColor} fontSize="8" fontWeight="bold" textAnchor="end" fillOpacity="0.6">090°</text>
              <text x="140" y="270" fill={accentColor} fontSize="8" fontWeight="bold" textAnchor="middle" fillOpacity="0.6">180°</text>
              <text x="12" y="143" fill={accentColor} fontSize="8" fontWeight="bold" textAnchor="start" fillOpacity="0.6">270°</text>

              {/* Rotating radar sweep line */}
              <line
                x1="140"
                y1="140"
                x2={sweepX}
                y2={sweepY}
                stroke={accentColor}
                strokeWidth="2"
                strokeLinecap="round"
                className="radar-sweep-beam"
              />

              {/* Channel sectors & blips */}
              {bandNodes.map((node) => {
                const isHit = node.isCurrent && detection === 'hit'
                const isFalseAlarm = node.isCurrent && detection === 'false_alarm'

                return (
                  <g key={node.band} className="radar-channel-node">
                    {/* Channel label radial marker */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isCurrent ? 14 : 9}
                      fill={
                        isHit
                          ? '#22c55e'
                          : isFalseAlarm
                          ? '#f43f5e'
                          : node.isCurrent
                          ? accentColor
                          : isDark
                          ? '#1e293b'
                          : '#ffffff'
                      }
                      stroke={node.isCurrent ? '#ffffff' : accentColor}
                      strokeWidth={node.isCurrent ? 2 : 1}
                      strokeOpacity={node.isCurrent ? 1 : 0.5}
                      className={node.isCurrent ? 'channel-active-glow' : ''}
                    />

                    {/* Detected target pulsing crosshair */}
                    {isHit && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="22"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                        className="radar-ping-ring"
                      />
                    )}

                    <text
                      x={node.x}
                      y={node.y + 3.5}
                      fill={node.isCurrent ? '#ffffff' : isDark ? '#f1f5f9' : '#1e293b'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      B{node.band}
                    </text>
                  </g>
                )
              })}

              {/* Center Receiver LO icon */}
              <circle cx="140" cy="140" r="12" fill={accentColor} />
              <circle cx="140" cy="140" r="18" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.5" />
              <text x="140" y="143" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                RX
              </text>
            </svg>

            {/* Scope Telemetry Overlay */}
            <div className="radar-scope-overlay">
              <div className="scope-stat-pill">
                <span className="scope-stat-label">AZIMUTH</span>
                <span className="scope-stat-value">{Math.floor(sweepAngle)}°</span>
              </div>
              <div className="scope-stat-pill">
                <span className="scope-stat-label">CURRENT CH</span>
                <span className="scope-stat-value" style={{ color: accentColor }}>
                  #{currentBand} ({(2000 + currentBand * 100)} MHz)
                </span>
              </div>
              <div className="scope-stat-pill">
                <span className="scope-stat-label">CONFIDENCE</span>
                <span className="scope-stat-value">{(confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ) : (
          /* Real-time Spectrum Waterfall / Oscilloscope */
          <div className="spectrum-analyzer-wrapper">
            <div className="spectrum-grid-labels">
              <span>0 dBm (Overload)</span>
              <span>-30 dBm (Target Signal)</span>
              <span>-60 dBm (False Alarm)</span>
              <span>-95 dBm (Noise Floor)</span>
            </div>

            <div className="spectrum-bars-container">
              {spectrumPoints.map((pt) => {
                // Map dBm [-95 to -20] to percentage [5% to 100%]
                const heightPct = Math.max(8, Math.min(98, ((pt.powerDbm + 95) / 75) * 100))
                const isCurrent = pt.band === currentBand

                return (
                  <div key={pt.band} className={`spectrum-col ${isCurrent ? 'tuned' : ''}`}>
                    <div className="spectrum-track">
                      <div
                        className={`spectrum-bar-fill ${
                          isCurrent && detection === 'hit'
                            ? 'hit'
                            : isCurrent && detection === 'false_alarm'
                            ? 'fa'
                            : isCurrent
                            ? 'active'
                            : ''
                        }`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {isCurrent && <div className="spectrum-peak-marker" />}
                      </div>
                    </div>
                    <span className="spectrum-band-label">B{pt.band}</span>
                    <span className="spectrum-freq-label">{pt.freq}M</span>
                  </div>
                )
              })}
            </div>

            <div className="spectrum-legend">
              <span className="spectrum-legend-item">
                <span className="legend-dot tuned"></span> Tuned LO (Band #{currentBand})
              </span>
              <span className="spectrum-legend-item">
                <span className="legend-dot hit"></span> Active Intercept
              </span>
              <span className="spectrum-legend-item">
                <span className="legend-dot noise"></span> Ambient Noise
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
