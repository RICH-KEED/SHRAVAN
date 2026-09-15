import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx'
import { RadarLogo, ActivityIcon, TargetIcon, BrainChipIcon, LayersIcon } from './Icons.jsx'

const navLinks = [
  { to: '/dashboard', label: 'Live Ops', icon: ActivityIcon },
  { to: '/scenarios', label: 'Scenario Lab', icon: TargetIcon },
  { to: '/benchmark', label: 'Benchmark', icon: LayersIcon },
  { to: '/inspectors', label: 'Inspectors', icon: BrainChipIcon },
  { to: '/architecture', label: 'Architecture', icon: LayersIcon },
]

export default function Navbar() {
  const { accent, setAccent, accents, isDark, toggleMode } = useTheme()
  const location = useLocation()
  const navContainerRef = useRef(null)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 })

  // Slide background indicator to the active tab
  useEffect(() => {
    const updatePill = () => {
      if (!navContainerRef.current) return
      const activeLink = navContainerRef.current.querySelector('.navbar-link.active')
      if (activeLink) {
        const containerRect = navContainerRef.current.getBoundingClientRect()
        const linkRect = activeLink.getBoundingClientRect()
        setPillStyle({
          left: linkRect.left - containerRect.left,
          width: linkRect.width,
          opacity: 1,
        })
      } else {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }))
      }
    }

    // Small delay to allow DOM transition to settle
    const id = setTimeout(updatePill, 20)
    window.addEventListener('resize', updatePill)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', updatePill)
    }
  }, [location.pathname])

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo" title="SHRAVAN — Smart Scan Strategy">
          <div className="navbar-logo-icon">
            <RadarLogo size={28} />
          </div>
          <div className="navbar-logo-text">
            <span className="navbar-logo-name">SHRAVAN</span>
            <span className="navbar-logo-sub">EW Spectrum Intel</span>
          </div>
        </Link>

        {/* Animated sliding pill tabs */}
        <div className="navbar-links" ref={navContainerRef}>
          <div
            className="navbar-sliding-pill"
            style={{
              transform: `translateX(${pillStyle.left}px)`,
              width: `${pillStyle.width}px`,
              opacity: pillStyle.opacity,
            }}
          />

          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `navbar-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={15} />
                <span>{link.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      <div className="navbar-right">
        {/* Tactical Color Switcher */}
        <div className="theme-switchers" title="Select Tactical Color Theme">
          {Object.values(accents).map((a) => (
            <button
              key={a.id}
              className={`theme-dot-btn ${accent === a.id ? 'active' : ''}`}
              style={{ backgroundColor: a.primary }}
              onClick={() => setAccent(a.id)}
              title={a.name}
              aria-label={`Switch to ${a.name}`}
            />
          ))}
        </div>

        {/* Cockpit Dark / Light Mode Toggle */}
        <button
          className="theme-mode-btn"
          onClick={toggleMode}
          title={isDark ? 'Switch to Light Claymorphic Mode' : 'Switch to Dark Cockpit Neumorphism'}
          aria-label="Toggle theme mode"
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div className="navbar-badge">
          <span className="navbar-badge-dot"></span>
          SIH26055
        </div>
      </div>
    </nav>
  )
}
