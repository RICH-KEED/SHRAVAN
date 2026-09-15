import { useState, useRef, useEffect } from 'react'

export default function CustomSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  label = '',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value) || options[0]

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelect = (val) => {
    if (disabled) return
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      {label && <span className="control-label">{label}</span>}
      <div className="custom-select-trigger-wrapper">
        <button
          type="button"
          className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="custom-select-trigger-content">
            {selectedOption?.icon && (
              <span className="custom-select-option-icon">
                {typeof selectedOption.icon === 'string' ? (
                  selectedOption.icon
                ) : (
                  <selectedOption.icon size={16} />
                )}
              </span>
            )}
            <span className="custom-select-trigger-label">
              {selectedOption?.label ?? value}
            </span>
          </div>
          <span className={`custom-select-caret ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="custom-select-dropdown animate-fadeIn" role="listbox">
            {options.map((opt) => {
              const isSelected = opt.value === value
              const IconComp = opt.icon
              return (
                <div
                  key={opt.value}
                  className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="custom-select-option-main">
                    {IconComp && (
                      <span className="custom-select-option-icon">
                        {typeof IconComp === 'string' ? IconComp : <IconComp size={16} />}
                      </span>
                    )}
                    <div className="custom-select-option-text">
                      <span className="custom-select-option-title">{opt.label}</span>
                      {opt.desc && (
                        <span className="custom-select-option-desc">{opt.desc}</span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="custom-select-check" style={{ color: 'var(--accent)' }}>
                      ✓
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
