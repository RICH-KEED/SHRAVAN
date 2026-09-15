import { createContext, useContext, useState, useEffect } from 'react'

const ACCENTS = {
  emerald: {
    id: 'emerald',
    name: 'Tactical Emerald',
    icon: '🟢',
    primary: '#10b981',
    soft: '#6ee7b7',
    deep: '#059669',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  amber: {
    id: 'amber',
    name: 'Radar Amber',
    icon: '🟡',
    primary: '#f59e0b',
    soft: '#fcd34d',
    deep: '#d97706',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    icon: '🌐',
    primary: '#06b6d4',
    soft: '#67e8f9',
    deep: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  crimson: {
    id: 'crimson',
    name: 'Defense Alert',
    icon: '🔴',
    primary: '#f43f5e',
    soft: '#fda4af',
    deep: '#e11d48',
    glow: 'rgba(244, 63, 94, 0.25)',
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem('shravan_accent') || 'emerald'
  })

  const [mode, setModeState] = useState(() => {
    return localStorage.getItem('shravan_mode') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
    localStorage.setItem('shravan_accent', accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
    localStorage.setItem('shravan_mode', mode)
  }, [mode])

  const setAccent = (newAccent) => {
    if (ACCENTS[newAccent]) {
      setAccentState(newAccent)
    }
  }

  const toggleMode = () => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const currentAccent = ACCENTS[accent] || ACCENTS.emerald

  return (
    <ThemeContext.Provider
      value={{
        accent,
        setAccent,
        accents: ACCENTS,
        currentAccent,
        mode,
        toggleMode,
        isDark: mode === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
