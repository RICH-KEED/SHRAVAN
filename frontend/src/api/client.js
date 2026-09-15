import {
  Orchestrator,
  runBenchmark as localRunBenchmark,
} from '../sim/simulatorEngine.js'

const API_BASE = '/api'
let isLocalFallback = false
const localOrchestrator = new Orchestrator({ scenario: 'cold_start' })
let localAutoRunInterval = null
const localListeners = new Set()

function broadcastLocalState() {
  const state = localOrchestrator.state()
  for (const listener of localListeners) {
    try {
      listener(state)
    } catch (e) {
      console.error(e)
    }
  }
}

async function fetchWithFallback(url, options = {}, timeoutMs = 8000) {
  if (isLocalFallback) {
    return null
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options,
    })
    clearTimeout(id)

    // Handle 405 (Method Not Allowed on static hosting) or 404 by falling back
    if (res.status === 405 || res.status === 404) {
      console.warn(`[SHRAVAN] Backend returned HTTP ${res.status} for ${url}. Activating in-browser cognitive simulation engine.`)
      isLocalFallback = true
      return null
    }

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}`
      try {
        const errorData = await res.json()
        if (errorData.detail) {
          errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)
        }
      } catch {
        errorDetail = `${res.status} ${res.statusText}`
      }
      throw new Error(`API request failed: ${errorDetail}`)
    }
    return await res.json()
  } catch (err) {
    clearTimeout(id)
    if (
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Connection refused') ||
      err.name === 'TypeError' ||
      err.name === 'AbortError'
    ) {
      console.warn(`[SHRAVAN] Backend service unreachable (${err.message}). Activating in-browser cognitive simulation engine.`)
      isLocalFallback = true
      return null
    }
    throw err
  }
}

export async function getScenarios() {
  const data = await fetchWithFallback('/scenarios')
  if (data !== null) return data
  return [
    'cold_start',
    'periodic',
    'frequency_agile',
    'spatially_scanning',
    'multiple_emitters',
    'sudden_threat',
    'dynamic_environment',
  ]
}

export async function initSim(config) {
  const data = await fetchWithFallback('/sim/init', {
    method: 'POST',
    body: JSON.stringify(config || {}),
  })
  if (data !== null) return data

  localOrchestrator.reset(config || {})
  localOrchestrator.running = false
  broadcastLocalState()
  return localOrchestrator.state()
}

export async function resetSim(config) {
  const data = await fetchWithFallback('/sim/reset', {
    method: 'POST',
    body: JSON.stringify(config || {}),
  })
  if (data !== null) return data

  if (localAutoRunInterval) {
    clearInterval(localAutoRunInterval)
    localAutoRunInterval = null
  }
  localOrchestrator.reset(config || {})
  localOrchestrator.running = false
  broadcastLocalState()
  return localOrchestrator.state()
}

export async function stepSim(numSteps = 1) {
  const data = await fetchWithFallback('/sim/step', {
    method: 'POST',
    body: JSON.stringify({ num_steps: numSteps }),
  })
  if (data !== null) return data

  let lastState = null
  for (let i = 0; i < numSteps; i++) {
    lastState = localOrchestrator.step()
  }
  broadcastLocalState()
  return lastState || localOrchestrator.state()
}

export async function runSim(numSteps = 50) {
  const data = await fetchWithFallback('/sim/run', {
    method: 'POST',
    body: JSON.stringify({ num_steps: numSteps }),
  })
  if (data !== null) return data

  let lastState = null
  for (let i = 0; i < numSteps; i++) {
    lastState = localOrchestrator.step()
  }
  broadcastLocalState()
  return lastState || localOrchestrator.state()
}

export async function getSimState() {
  const data = await fetchWithFallback('/sim/state')
  if (data !== null) return data
  return localOrchestrator.state()
}

export async function startAutoRun() {
  const data = await fetchWithFallback('/sim/start', { method: 'POST' })
  if (data !== null) return data

  localOrchestrator.running = true
  if (!localAutoRunInterval) {
    localAutoRunInterval = setInterval(() => {
      if (localOrchestrator.running) {
        localOrchestrator.step()
        broadcastLocalState()
      }
    }, 150)
  }
  return { status: 'started' }
}

export async function stopAutoRun() {
  const data = await fetchWithFallback('/sim/stop', { method: 'POST' })
  if (data !== null) return data

  localOrchestrator.running = false
  if (localAutoRunInterval) {
    clearInterval(localAutoRunInterval)
    localAutoRunInterval = null
  }
  broadcastLocalState()
  return { status: 'stopped' }
}

export async function getTechnicalInspector() {
  const data = await fetchWithFallback('/inspector/technical')
  if (data !== null) return data
  return localOrchestrator.inspectorState()
}

export async function getEmitterInspector() {
  const data = await fetchWithFallback('/inspector/emitter')
  if (data !== null) return data
  return localOrchestrator.emitterInspector()
}

export async function runBenchmark(config) {
  const data = await fetchWithFallback(
    '/benchmark',
    {
      method: 'POST',
      body: JSON.stringify(config || {}),
    },
    30000
  )
  if (data !== null) return data
  return localRunBenchmark(config || {})
}

export function connectWebSocket({ onMessage, onOpen, onClose, onError }) {
  let ws = null
  let isClosedManually = false
  let reconnectTimer = null
  let retryCount = 0

  const listener = (state) => {
    if (onMessage) onMessage(state)
  }

  // If already in local fallback mode, register listener and emit initial state
  if (isLocalFallback) {
    localListeners.add(listener)
    setTimeout(() => {
      if (onOpen) onOpen({ type: 'open' })
      if (onMessage) onMessage(localOrchestrator.state())
    }, 40)

    return {
      close: () => {
        isClosedManually = true
        localListeners.delete(listener)
      },
      getSocket: () => null,
    }
  }

  const connect = () => {
    if (isClosedManually) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${proto}://${window.location.host}/api/ws`

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = (evt) => {
        retryCount = 0
        if (onOpen) onOpen(evt)
      }

      ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data)
          if (onMessage) onMessage(parsed)
        } catch {
          if (onMessage) onMessage(e.data)
        }
      }

      ws.onerror = (err) => {
        // Fallback gracefully on static hosts
        if (!isLocalFallback) {
          console.warn('[SHRAVAN] WebSocket connection error. Switching to local state broadcaster.')
          isLocalFallback = true
          localListeners.add(listener)
          if (onOpen) onOpen({ type: 'open' })
          if (onMessage) onMessage(localOrchestrator.state())
        }
      }

      ws.onclose = (evt) => {
        if (onClose) onClose(evt)
        if (!isClosedManually && !isLocalFallback) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000)
          retryCount++
          reconnectTimer = setTimeout(connect, delay)
        }
      }
    } catch (err) {
      if (!isLocalFallback) {
        console.warn('[SHRAVAN] WebSocket initialization error. Switching to local state broadcaster.')
        isLocalFallback = true
        localListeners.add(listener)
        if (onOpen) onOpen({ type: 'open' })
        if (onMessage) onMessage(localOrchestrator.state())
      }
    }
  }

  connect()

  return {
    close: () => {
      isClosedManually = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
      localListeners.delete(listener)
    },
    getSocket: () => ws,
  }
}
