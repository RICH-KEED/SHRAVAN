import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Landing from './components/Landing.jsx'
import Dashboard from './components/Dashboard.jsx'
import ScenarioLab from './components/ScenarioLab.jsx'
import Benchmark from './components/Benchmark.jsx'
import Inspectors from './components/Inspectors.jsx'
import Architecture from './components/Architecture.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

export default function App() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <ThemeProvider>
      <div className="app">
        {!isLanding && <Navbar />}
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scenarios" element={<ScenarioLab />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="/inspectors" element={<Inspectors />} />
          <Route path="/architecture" element={<Architecture />} />
        </Routes>
      </div>
    </ThemeProvider>
  )
}
