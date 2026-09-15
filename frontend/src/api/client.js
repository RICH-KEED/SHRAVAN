const API_BASE = '/api'

async function fetchJSON(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options,
    })
    clearTimeout(id)

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
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`)
    }
    throw err
  }
}

export async function getScenarios() {
  return fetchJSON('/scenarios')
}

export async function initSim(config) {
  return fetchJSON('/sim/init', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export async function resetSim(config) {
  return fetchJSON('/sim/reset', {
    method: 'POST',
    body: JSON.stringify(config || {}),
  })
}

export async function stepSim(numSteps = 1) {
  return fetchJSON('/sim/step', {
    method: 'POST',
    body: JSON.stringify({ num_steps: numSteps }),
  })
}

export async function runSim(numSteps = 50) {
  return fetchJSON('/sim/run', {
    method: 'POST',
    body: JSON.stringify({ num_steps: numSteps }),
  })
}

export async function getSimState() {
  return fetchJSON('/sim/state')
}

export async function startAutoRun() {
  return fetchJSON('/sim/start', { method: 'POST' })
}

export async function stopAutoRun() {
  return fetchJSON('/sim/stop', { method: 'POST' })
}

export async function getTechnicalInspector() {
  return fetchJSON('/inspector/technical')
}

export async function getEmitterInspector() {
  return fetchJSON('/inspector/emitter')
}

export async function runBenchmark(config) {
  return fetchJSON('/benchmark', {
    method: 'POST',
    body: JSON.stringify(config),
  }, 30000) // benchmarks can take a few seconds
}

export function connectWebSocket({ onMessage, onOpen, onClose, onError }) {
  let ws = null
  let isClosedManually = false
  let reconnectTimer = null
  let retryCount = 0

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
        if (onError) onError(err)
      }

      ws.onclose = (evt) => {
        if (onClose) onClose(evt)
        if (!isClosedManually) {
          // Exponential backoff reconnect: 1s, 2s, 4s, max 8s
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000)
          retryCount++
          reconnectTimer = setTimeout(connect, delay)
        }
      }
    } catch (err) {
      if (onError) onError(err)
    }
  }

  connect()

  return {
    close: () => {
      isClosedManually = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.close()
      }
    },
    getSocket: () => ws,
  }
}
