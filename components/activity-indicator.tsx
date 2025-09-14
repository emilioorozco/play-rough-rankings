'use client'

import { useActivity } from './activity-provider'

interface ActivityIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function ActivityIndicator({ className = '', showDetails = false }: ActivityIndicatorProps) {
  const { activity } = useActivity()

  const getStatusColor = () => {
    if (!activity.isActive) return 'var(--pico-muted-color)'
    if (activity.isViewing) return 'var(--pico-contrast-background)'
    return 'var(--pico-primary)'
  }

  const getStatusText = () => {
    if (!activity.isActive) return 'Away'
    if (activity.isViewing && activity.viewingTarget) return `Viewing ${activity.viewingTarget}`
    return 'Active'
  }

  return (
    <div className={`activity-indicator ${className}`}>
      <div 
        className="activity-dot"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          display: 'inline-block',
          marginRight: showDetails ? '0.5rem' : '0',
          animation: activity.isActive ? 'pulse 2s infinite' : 'none',
        }}
      />
      {showDetails && (
        <span className="activity-status" style={{ fontSize: '0.875rem', color: getStatusColor() }}>
          {getStatusText()}
        </span>
      )}
    </div>
  )
}