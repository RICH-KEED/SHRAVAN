import { useState } from 'react'
import { LayersIcon } from './Icons.jsx'

const NODES = [
  {
    id: 'env',
    label: 'RF Environment',
    color: '',
    role: 'Simulates active emitter electromagnetic transmissions across 10 RF bands (2000–3000 MHz).',
    inputs: 'Scenario configuration (7 scenarios, seed, duration)',
    outputs: 'True active emitter spectrum (hidden ground truth)',
  },
  {
    id: 'receiver',
    label: 'Simulated Receiver',
    color: '',
    role: 'Narrowband heterodyne receiver model — tunes to exactly one 100 MHz channel per dwell cycle.',
    inputs: 'Candidate band selection from Smart Scheduler',
    outputs: 'Raw RF energy sample at specified band and dwell duration (0.5s)',
  },
  {
    id: 'detection',
    label: 'Detection Model',
    color: '',
    role: 'Applies energy detector threshold with configurable False Alarm Probability (Pfa = 0.05).',
    inputs: 'Receiver sample + Ground truth coincident signal',
    outputs: 'Hit / Miss / False Alarm classification with signal confidence',
  },
  {
    id: 'belief',
    label: 'Belief Engine',
    color: 'teal',
    role: 'Maintains per-band probability belief distributions updated recursively via Bayesian/empirical weights.',
    inputs: 'Instantaneous Hit / Miss / False Alarm events',
    outputs: 'Per-channel belief vectors, observation counts, and periodicity registers',
  },
  {
    id: 'prediction',
    label: 'Prediction Engine',
    color: 'accent',
    role: 'Estimates pulse repetition interval (PRI) / periodicity and predicts next emitter opportunity with confidence.',
    inputs: 'Belief timing history & recent detection timestamps',
    outputs: 'Predicted next activation time (T_next) + confidence score per band',
  },
  {
    id: 'scheduler',
    label: 'Smart Scheduler',
    color: 'accent',
    role: 'Multi-attribute utility optimization: balances predicted return, recent hit memory, periodicity, and exploration.',
    inputs: 'Belief state + Predictions + Dwell visit counts',
    outputs: 'Optimal next frequency band + human-readable "Why This Band?" rationale',
  },
  {
    id: 'dwell',
    label: 'Next Dwell Action',
    color: 'teal',
    role: 'Commands receiver LO to retune frequency synthesizer and schedule the next measurement dwell.',
    inputs: 'Selected Band index (0–9)',
    outputs: 'Hardware/Synthesizer retune command completing the closed loop',
  },
]

export default function Architecture() {
  const [activeNode, setActiveNode] = useState(NODES[3]) // Default to Belief Engine

  return (
    <div className="page animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">
          <LayersIcon size={24} style={{ color: 'var(--accent)' }} />
          <span>Closed-Loop System Architecture</span>
        </h1>
        <p className="page-subtitle">
          SHRAVAN's autonomous scan-scheduling pipeline: RF Environment → Receiver → Detection → Belief → Prediction → Scheduler → Dwell
        </p>
      </div>

      {/* INTERACTIVE CLOSED-LOOP FLOW */}
      <div className="clay-card" style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Interactive Decision Flow</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Click any component to inspect its role, mathematical inputs, and outputs in the closed loop
          </p>
        </div>

        <div className="arch-page">
          {NODES.map((node, i) => {
            const isSelected = activeNode.id === node.id
            return (
              <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  className={`arch-page-node ${node.color} ${isSelected ? 'active-node' : ''}`}
                  onClick={() => setActiveNode(node)}
                >
                  {node.label}
                </div>
                {i < NODES.length - 1 && <div className="arch-page-arrow" />}
              </div>
            )
          })}
          <div className="arch-page-feedback">
            ↺ Feedback: Detection Result → Belief Update → Prediction Refresh → Scan Retune
          </div>
        </div>
      </div>

      {/* SELECTED COMPONENT DEEP DIVE */}
      <div className="clay-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent)' }}>
        <div className="clay-card-title">
          <span className="clay-card-title-dot"></span>
          Subsystem Deep Dive: {activeNode.label}
        </div>
        <p style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.6 }}>
          {activeNode.role}
        </p>
        <div className="dashboard-grid-2">
          <div className="prediction-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span className="inspector-key">Inputs</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{activeNode.inputs}</span>
          </div>
          <div className="prediction-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span className="inspector-key">Outputs</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{activeNode.outputs}</span>
          </div>
        </div>
      </div>

      {/* DECISION LOOP SEQUENCE */}
      <div className="clay-card" style={{ marginBottom: '24px' }}>
        <div className="clay-card-title">
          <span className="clay-card-title-dot" style={{ background: 'var(--teal)' }}></span>
          Per-Dwell Execution Lifecycle (FR-10 Closed Loop)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {[
            { step: 1, title: 'Observe', text: 'Tune receiver to scheduled channel and integrate power over dwell window.' },
            { step: 2, title: 'Classify', text: 'Compare energy metric to noise threshold: yield Hit, Miss, or False Alarm.' },
            { step: 3, title: 'Update Belief', text: 'Update per-channel posterior belief and observation counters.' },
            { step: 4, title: 'Estimate Rhythm', text: 'Calculate inter-arrival timing deltas to infer periodic pulse intervals.' },
            { step: 5, title: 'Project Horizon', text: 'Calculate next window arrival timestamp and decayed confidence.' },
            { step: 6, title: 'Score Candidates', text: 'Combine Predicted Activity + Recent History + Exploration bonus.' },
            { step: 7, title: 'Explain & Decide', text: 'Select argmax score band and construct rationale explaining choice.' },
            { step: 8, title: 'Execute & Repeat', text: 'Synthesizer retunes to new band; step simulation forward.' },
          ].map((item) => (
            <div key={item.step} className="prediction-item">
              <span className="prediction-band" style={{ color: 'var(--accent)', minWidth: '32px' }}>
                #{item.step}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GROUND TRUTH ISOLATION CONSTRAINT */}
      <div className="clay-card" style={{ borderLeft: '4px solid var(--coral)' }}>
        <div className="clay-card-title">
          <span className="clay-card-title-dot" style={{ background: 'var(--coral)' }}></span>
          Strict Architectural Constraint — Ground-Truth Isolation (FR-16)
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          The scheduler operates exclusively on historical receiver observations, belief distributions, and estimated rhythm models.
          At no time does the scheduling policy access future emitter ground truth or cheat via environmental cheat-vectors.
          Future ground truth is strictly segregated for evaluation in the <strong>Analyst View</strong> to validate algorithmic convergence.
        </p>
      </div>
    </div>
  )
}
