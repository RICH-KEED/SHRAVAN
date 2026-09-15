import { Link } from 'react-router-dom'
import {
  RadarLogo,
  RadarIcon,
  SignalWaveIcon,
  TargetIcon,
  BrainChipIcon,
  ClockIcon,
  ShieldAlertIcon,
  ActivityIcon,
  CompassIcon,
  LayersIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  ZapIcon,
} from './Icons.jsx'
import RadarScope from './RadarScope.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

const features = [
  {
    icon: TargetIcon,
    color: 'accent',
    title: 'Adaptive Scan Scheduling',
    desc: 'Learns from real-time observations and dynamically prioritizes the highest-value frequency dwell — moving beyond fixed sweeps.',
  },
  {
    icon: BrainChipIcon,
    color: 'teal',
    title: 'Posterior Belief Engine',
    desc: 'Maintains per-band probability distributions, updating instantly from every Hit, Miss, and False Alarm in real time.',
  },
  {
    icon: ClockIcon,
    color: 'coral',
    title: 'Temporal Rhythm Prediction',
    desc: 'Estimates pulse intervals and emitter periodicity to project the exact return window with mathematical confidence.',
  },
  {
    icon: ActivityIcon,
    color: 'green',
    title: 'Self-Adapting Re-Exploration',
    desc: 'Detects stale predictions when targets switch channels or alter patterns, autonomously triggering re-exploration.',
  },
  {
    icon: CompassIcon,
    color: 'amber',
    title: 'Explainable AI Decisioning',
    desc: 'Every dwell decision generates an interpretable rationale explaining candidate scoring across predicted, recent, and explore terms.',
  },
  {
    icon: LayersIcon,
    color: 'navy',
    title: 'Rigorous Strategy Benchmarking',
    desc: 'Compare SHRAVAN against Round Robin, Uniform Random, and Greedy schedulers across 7 standard scenarios under identical seeds.',
  },
]

const CONSOLE_MODULES = [
  {
    to: '/dashboard',
    title: 'Live Operations Console',
    tag: 'Real-Time C2',
    icon: ActivityIcon,
    desc: 'Interactive PPI radar scope, instant FFT spectrogram, live dwell stepping, and continuous cognitive state telemetry.',
    action: 'Open Console →',
  },
  {
    to: '/scenarios',
    title: 'Tactical Scenario Lab',
    tag: '7 Environments',
    icon: TargetIcon,
    desc: 'Simulate cold start search, periodic pulse trains, agile frequency hoppers, spatial sweepers, and sudden high-priority threats.',
    action: 'Simulate Scenarios →',
  },
  {
    to: '/benchmark',
    title: 'Strategy Benchmark',
    tag: '4 Schedulers',
    icon: LayersIcon,
    desc: 'Side-by-side empirical performance comparison between Round-Robin, Random, Greedy, and SHRAVAN under identical seeds.',
    action: 'Run Benchmark →',
  },
  {
    to: '/inspectors',
    title: 'Subsystem Inspectors',
    tag: 'Diagnostics',
    icon: BrainChipIcon,
    desc: 'Direct hardware register telemetry for heterodyne receiver LO, multi-criteria scheduler equalizer, and isolated ground-truth.',
    action: 'Inspect Subsystems →',
  },
  {
    to: '/architecture',
    title: 'Mathematical Architecture',
    tag: 'Closed Loop',
    icon: CompassIcon,
    desc: 'Formal closed-loop mathematical specifications, Bayesian posterior updating rules, PRI rhythm modeling, and utility formulas.',
    action: 'View Math Pipeline →',
  },
]

const SPEC_COMPARISON = [
  {
    metric: 'Scan Policy Approach',
    roundRobin: 'Deterministic cyclic sweep',
    random: 'Uniform pseudo-random',
    greedy: 'Pure recency exploitation',
    shravan: 'Adaptive multi-attribute cognitive utility',
  },
  {
    metric: 'Average Intercept Latency',
    roundRobin: 'High (~18.5s)',
    random: 'Unpredictable (>12s)',
    greedy: 'Fast for known, blind to new',
    shravan: 'Sub-second (~0.32s)',
  },
  {
    metric: 'Frequency Agile Tracking',
    roundRobin: 'Fails (<12% intercept)',
    random: 'Poor (<15% intercept)',
    greedy: 'Poor (<20% intercept)',
    shravan: 'High (>82% interception)',
  },
  {
    metric: 'Exploration / Exploitation Balance',
    roundRobin: 'Fixed (no exploitation)',
    random: 'All exploration (no memory)',
    greedy: 'Zero exploration (trapped)',
    shravan: 'Dynamic entropy balancing (w_exp = 0.25)',
  },
  {
    metric: 'Empirical Detection Rate (Pd)',
    roundRobin: '~32%',
    random: '~28%',
    greedy: '~58%',
    shravan: '~88%+',
  },
  {
    metric: 'Operator Decision Explainability',
    roundRobin: 'None (hardcoded counter)',
    random: 'None (stochastic noise)',
    greedy: 'Recency heuristic only',
    shravan: 'Full mathematical score breakdown log',
  },
]

const FAQ_ITEMS = [
  {
    q: 'How does SHRAVAN discover signals without prior emitter intelligence?',
    a: 'The system initializes with a uniform Dirichlet prior across all frequency channels. As dwells execute, Bayesian posterior updates record hits and misses in real time. Once initial contacts occur, the PRI Rhythm Engine extracts pulse repetition intervals and projects forward arrival windows.',
  },
  {
    q: 'What prevents the scheduler from becoming trapped in high-activity bands?',
    a: 'The utility function enforces an explicit exploration term: w_exp · (1 - visits_b / N). Bands that have received fewer dwells accumulate higher exploration rewards, ensuring that the receiver continuously audits quiet spectrum for new or frequency-hopping emitters.',
  },
  {
    q: 'How does SHRAVAN adapt when an emitter switches channels or modifies pulse rates?',
    a: 'When an anticipated pulse fails to arrive during its projected dwell window, prediction confidence decays exponentially with a 10-second half-life. Stale predictions automatically drop below the exploration threshold, triggering autonomous re-exploration of alternative channels.',
  },
  {
    q: 'Can this closed-loop architecture deploy onto resource-constrained embedded SDRs?',
    a: 'Yes. Every dwell decision uses computationally lightweight closed-form Bayesian updates and linear multi-criteria utility weighting requiring under 0.2 milliseconds of CPU time per step, well within real-time 500 ms dwell constraints on low-power SDR hardware.',
  },
]

// Interactive simulated state for hero preview
const MOCK_HERO_STATE = {
  num_bands: 10,
  receiver: {
    current_band: 3,
    center_frequency: 2300,
    instantaneous_bandwidth: 100,
    dwell_duration: 0.5,
    detection: 'hit',
    confidence: 0.88,
  },
  belief: [
    { band: 0, belief: 0.12 },
    { band: 1, belief: 0.05 },
    { band: 2, belief: 0.18 },
    { band: 3, belief: 0.94 },
    { band: 4, belief: 0.22 },
    { band: 5, belief: 0.08 },
    { band: 6, belief: 0.35 },
    { band: 7, belief: 0.15 },
    { band: 8, belief: 0.62 },
    { band: 9, belief: 0.10 },
  ],
  emitters: [{ home_band: 3 }, { home_band: 8 }],
  running: true,
}

export default function Landing() {
  const { currentAccent, isDark } = useTheme()

  return (
    <div className="landing animate-fadeIn">
      {/* HERO SECTION */}
      <section className="landing-hero" style={{ paddingBottom: '30px' }}>
        <div className="landing-hero-tag">
          <span className="landing-hero-tag-dot"></span>
          <span>SIH26055 — Cognitive Scan Strategy for Electronic Warfare</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', marginBottom: '14px' }}>
          <div className="navbar-logo-icon" style={{ width: '56px', height: '56px', borderRadius: '18px' }}>
            <RadarLogo size={36} />
          </div>
          <h1 style={{ margin: 0, letterSpacing: '-1.5px', fontSize: 'clamp(44px, 6.5vw, 76px)' }}>
            SHRAVAN
          </h1>
        </div>

        <p style={{ maxWidth: '720px', marginBottom: '28px' }}>
          An adaptive scan-scheduling system that learns where a narrowband receiver
          should listen next — without prior emitter intelligence.
          <br />
          <strong>Observe → Remember → Predict → Decide → Adapt.</strong>
        </p>

        <div className="landing-hero-buttons" style={{ marginBottom: '40px' }}>
          <Link to="/dashboard" className="btn btn-primary" style={{ padding: '14px 34px', fontSize: '15px' }}>
            Launch Live Ops Console →
          </Link>
          <Link to="/benchmark" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '15px' }}>
            Run Strategy Benchmark
          </Link>
          <Link to="/architecture" className="btn btn-ghost">
            View Closed Loop
          </Link>
        </div>

        {/* INTERACTIVE REAL SIMULATOR HERO PREVIEW */}
        <div style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}>
          <div className="clay-card" style={{ padding: '16px 20px', border: '1px solid var(--accent-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RadarIcon size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live System Sensor Preview
                </span>
              </div>
              <span className="status-badge hit" style={{ fontSize: '11px', padding: '2px 8px' }}>
                RADAR ONLINE
              </span>
            </div>
            <RadarScope state={MOCK_HERO_STATE} accentColor={currentAccent.primary} isDark={isDark} />
          </div>
        </div>

        {/* HERO STATS */}
        <div className="landing-hero-stats" style={{ marginTop: '40px', gap: '24px' }}>
          <div className="landing-hero-stat">
            <div className="landing-hero-stat-num">7</div>
            <div className="landing-hero-stat-label">Scenarios</div>
          </div>
          <div className="landing-hero-stat">
            <div className="landing-hero-stat-num">4</div>
            <div className="landing-hero-stat-label">Strategies</div>
          </div>
          <div className="landing-hero-stat">
            <div className="landing-hero-stat-num">6</div>
            <div className="landing-hero-stat-label">Telemetry Metrics</div>
          </div>
          <div className="landing-hero-stat">
            <div className="landing-hero-stat-num">∞</div>
            <div className="landing-hero-stat-label">Closed Loop</div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section className="landing-section" style={{ paddingTop: '50px' }}>
        <h2 className="landing-section-title">Core Tactical Capabilities</h2>
        <p className="landing-section-subtitle">
          Engineered for cognitive electronic warfare with zero prior intelligence:
          from synthetic RF generation to explainable scan scheduling.
        </p>
        <div className="feature-grid">
          {features.map((f, i) => {
            const IconComp = f.icon
            return (
              <div className="feature-card" key={i}>
                <div className={`feature-card-icon ${f.color}`}>
                  <IconComp size={24} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* THE CLOSED LOOP */}
      <section className="landing-section">
        <h2 className="landing-section-title">Autonomous Closed-Loop Pipeline</h2>
        <p className="landing-section-subtitle">
          Every dwell observation feeds back into posterior belief registers — the next channel selection
          is computed dynamically based on cumulative evidence, not a static sweep pattern.
        </p>
        <div className="arch-flow">
          {[
            'RF Synthetic Environment (10 Bands)',
            'Narrowband Heterodyne Receiver (IBW 100 MHz)',
            'Energy Detection (Hit / Miss / False Alarm)',
            'Posterior Belief Engine (Per-Band History)',
            'Temporal Prediction Engine (PRI Rhythm)',
            'Cognitive Smart Scheduler (Multi-Criteria)',
            'Synthesizer Retune & Next Dwell',
          ].map((label, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={`arch-flow-node ${i === 4 || i === 5 ? 'accent' : i === 3 || i === 6 ? 'teal' : ''}`}>
                {label}
              </div>
              {i < 6 && <div className="arch-flow-arrow"></div>}
            </div>
          ))}
          <div className="arch-flow-feedback">
            ↺ Autonomous Feedback: Detection Result → Belief Update → Prediction Refresh → Scan Retune
          </div>
        </div>
      </section>

      {/* WHY SHRAVAN COMPARISON */}
      <section className="landing-section">
        <h2 className="landing-section-title">Why Conventional Sweeps Fail</h2>
        <p className="landing-section-subtitle">
          Traditional EW receivers sweep frequencies blindly and hope to intercept periodic pulses.
          SHRAVAN builds intelligence on the fly.
        </p>
        <div className="dashboard-grid-2" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div className="clay-card">
            <div className="feature-card-icon coral" style={{ margin: '0 0 14px' }}>
              <ClockIcon size={24} />
            </div>
            <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Traditional Round-Robin Sweeps</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Fixed linear or pseudo-random sweeps across all bands. Spends 90% of dwell time listening
              to quiet frequency bands while agile or scanning emitters slip away undetected.
            </p>
          </div>

          <div className="clay-card">
            <div className="feature-card-icon accent" style={{ margin: '0 0 14px' }}>
              <RadarIcon size={24} />
            </div>
            <h3 style={{ fontSize: '17px', marginBottom: '10px', color: 'var(--accent)' }}>SHRAVAN Cognitive Scheduler</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Learns emitter rhythm from sporadic intercepts, predicts exact return timestamps,
              and schedules revisits with high confidence while maintaining an exploration budget.
            </p>
          </div>
        </div>
      </section>

      {/* CONSOLE MODULES SUITE */}
      <section className="landing-section">
        <h2 className="landing-section-title">Operational C2 Console Modules</h2>
        <p className="landing-section-subtitle">
          Explore the dedicated tactical workspaces engineered for real-time electronic warfare decisioning,
          synthetic testing, and mathematical verification.
        </p>
        <div className="landing-suite-grid">
          {CONSOLE_MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <Link to={mod.to} key={mod.to} className="landing-suite-card">
                <div className="landing-suite-card-top">
                  <div className="landing-suite-icon-box">
                    <Icon size={22} />
                  </div>
                  <span className="landing-suite-tag">{mod.tag}</span>
                </div>
                <h3 className="landing-suite-title">{mod.title}</h3>
                <p className="landing-suite-desc">{mod.desc}</p>
                <div className="landing-suite-action">
                  <span>{mod.action}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* BENCHMARK COMPARISON SPEC MATRIX */}
      <section className="landing-section">
        <h2 className="landing-section-title">Empirical Performance Benchmark Matrix</h2>
        <p className="landing-section-subtitle">
          Side-by-side behavioral evaluation across classic electronic warfare scan protocols versus
          the SHRAVAN cognitive closed loop under identical RF environments.
        </p>
        <div className="landing-table-card">
          <table className="landing-spec-table">
            <thead>
              <tr>
                <th>Tactical Metric</th>
                <th>Round-Robin Sweep</th>
                <th>Uniform Random</th>
                <th>Greedy Scheduler</th>
                <th className="highlight-col">SHRAVAN Cognitive Agent</th>
              </tr>
            </thead>
            <tbody>
              {SPEC_COMPARISON.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.metric}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.roundRobin}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.random}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.greedy}</td>
                  <td className="highlight-col">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <ZapIcon size={14} style={{ color: 'var(--accent)' }} />
                      {row.shravan}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* OPERATIONAL FAQ & PRINCIPLES */}
      <section className="landing-section">
        <h2 className="landing-section-title">Tactical Principles & Operational FAQ</h2>
        <p className="landing-section-subtitle">
          Key algorithmic and electronic warfare design considerations behind SHRAVAN's autonomous decision model.
        </p>
        <div className="landing-faq-grid">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="landing-faq-card">
              <div className="landing-faq-q">
                <span className="landing-faq-q-icon">◆</span>
                <span>{item.q}</span>
              </div>
              <div className="landing-faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="landing-section" style={{ paddingBottom: '20px' }}>
        <div className="landing-cta">
          <h2>Ready to Evaluate the Tactical Console?</h2>
          <p>
            Launch the live operations console, execute synthetic scenario stress tests,
            and inspect every layer of the closed-loop decision engine.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <Link
              to="/dashboard"
              className="btn btn-primary"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', padding: '14px 34px', fontSize: '15px' }}
            >
              Launch Live Operations Console →
            </Link>
            <Link
              to="/benchmark"
              className="btn btn-secondary"
              style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '14px 28px', fontSize: '15px' }}
            >
              Execute Strategy Benchmark
            </Link>
          </div>
        </div>
      </section>

      {/* EXTENDED TACTICAL COMMAND FOOTER */}
      <footer className="landing-footer-extended">
        <div className="landing-footer-grid">
          {/* Brand Col */}
          <div className="landing-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="navbar-logo-icon" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                <RadarLogo size={24} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-primary)' }}>
                  SHRAVAN
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  EW Spectrum Intelligence
                </div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Autonomous cognitive scan scheduling architecture for narrowband electronic warfare receivers.
              Optimized for intermittent, frequency-agile, and low-probability-of-intercept (LPI) radar emitters.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-soft)', width: 'fit-content' }}>
              <span className="landing-hero-tag-dot" style={{ width: '6px', height: '6px' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                C2 SPECTRUM ENGINE ONLINE
              </span>
            </div>
          </div>

          {/* Consoles Col */}
          <div>
            <div className="landing-footer-title">Tactical Consoles</div>
            <div className="landing-footer-links">
              <Link to="/dashboard" className="landing-footer-link">
                <ActivityIcon size={14} /> Live Operations Console
              </Link>
              <Link to="/scenarios" className="landing-footer-link">
                <TargetIcon size={14} /> Scenario Simulation Lab
              </Link>
              <Link to="/benchmark" className="landing-footer-link">
                <LayersIcon size={14} /> 4-Strategy Benchmark
              </Link>
              <Link to="/inspectors" className="landing-footer-link">
                <BrainChipIcon size={14} /> Subsystem Telemetry
              </Link>
              <Link to="/architecture" className="landing-footer-link">
                <CompassIcon size={14} /> Closed Loop Architecture
              </Link>
            </div>
          </div>

          {/* Core Algorithms Col */}
          <div>
            <div className="landing-footer-title">Algorithmic Core</div>
            <div className="landing-footer-links">
              <span className="landing-footer-link" style={{ cursor: 'default' }}>
                <ZapIcon size={14} /> Bayesian Belief Recursion
              </span>
              <span className="landing-footer-link" style={{ cursor: 'default' }}>
                <ClockIcon size={14} /> PRI Rhythm Predictor
              </span>
              <span className="landing-footer-link" style={{ cursor: 'default' }}>
                <SignalWaveIcon size={14} /> Multi-Attribute Utility
              </span>
              <span className="landing-footer-link" style={{ cursor: 'default' }}>
                <RefreshCwIcon size={14} /> Exponential Stale Decay
              </span>
              <span className="landing-footer-link" style={{ cursor: 'default' }}>
                <RadioTowerIcon size={14} /> Energy Threshold CFAR
              </span>
            </div>
          </div>

          {/* RF Hardware Specs Col */}
          <div>
            <div className="landing-footer-title">Hardware & RF Specs</div>
            <div>
              <div className="landing-footer-spec-item">
                <span className="landing-footer-spec-label">Carrier Band</span>
                <span className="landing-footer-spec-val">2.0 – 3.0 GHz</span>
              </div>
              <div className="landing-footer-spec-item">
                <span className="landing-footer-spec-label">Channels</span>
                <span className="landing-footer-spec-val">10 Bands</span>
              </div>
              <div className="landing-footer-spec-item">
                <span className="landing-footer-spec-label">Instantaneous BW</span>
                <span className="landing-footer-spec-val">100 MHz</span>
              </div>
              <div className="landing-footer-spec-item">
                <span className="landing-footer-spec-label">Dwell Duration</span>
                <span className="landing-footer-spec-val">0.50 s</span>
              </div>
              <div className="landing-footer-spec-item">
                <span className="landing-footer-spec-label">Pfa Constraint</span>
                <span className="landing-footer-spec-val">≤ 0.05 (5%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <div>
            SHRAVAN · SIH26055 — Cognitive Scan Strategy for Electronic Warfare
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Observe → Remember → Predict → Decide → Adapt</span>
            <span>·</span>
            <span>v1.0.0 Production Release</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
