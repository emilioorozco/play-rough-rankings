'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'

interface PrivacyControlsProps {
  playerId: string
  currentVisibility: 'PUBLIC' | 'PRIVATE'
}

export function PrivacyControls({ currentVisibility }: PrivacyControlsProps) {
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(currentVisibility)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Mutation for updating profile visibility (via user preferences)
  const updateProfileMutation = trpc.userPreferences.update.useMutation({
    onSuccess: () => {
      setSuccess('Privacy settings updated successfully!')
      setError(null)
      setIsLoading(false)
    },
    onError: (error) => {
      setError(error.message)
      setSuccess(null)
      setIsLoading(false)
    },
  })

  const handleSavePrivacySettings = async () => {
    if (visibility === currentVisibility) {
      setError('No changes to save')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await updateProfileMutation.mutateAsync({
        profileVisibility: visibility,
      })
    } catch {}
  }

  const handleReset = () => {
    setVisibility(currentVisibility)
    setError(null)
    setSuccess(null)
  }

  const getVisibilityDescription = (visibilityType: 'PUBLIC' | 'PRIVATE') => {
    switch (visibilityType) {
      case 'PUBLIC':
        return {
          title: 'Public Profile',
          description: 'Your statistics and tournament results are visible to all users',
          features: [
            'Your name appears on leaderboards',
            'Other players can view your tournament history',
            'Your statistics are included in public rankings',
            'Your profile can be found through player search',
            'Tournament organizers can see your performance data',
          ],
          icon: '🌐',
          color: 'public',
        }
      case 'PRIVATE':
        return {
          title: 'Private Profile',
          description: 'Your statistics are hidden from other users',
          features: [
            'You appear as "Private Player" on leaderboards',
            'Other players cannot view your tournament history',
            'Your statistics are excluded from public rankings',
            'Your profile cannot be found through player search',
            'Only you can see your detailed performance data',
          ],
          icon: '🔒',
          color: 'private',
        }
    }
  }

  const publicInfo = getVisibilityDescription('PUBLIC')
  const privateInfo = getVisibilityDescription('PRIVATE')

  return (
    <div className="privacy-controls">
      <header className="privacy-header mb-4">
        <h3>Privacy Controls</h3>
        <p>
          Control who can see your tournament statistics and profile information. 
          You can change these settings at any time.
        </p>
      </header>

      {/* Status Messages */}
      {error && (
        <div className="error-message mb-3">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message mb-3">
          {success}
        </div>
      )}

      {/* Current Setting Display */}
      <div className="current-setting mb-4">
        <h4>Current Privacy Setting</h4>
        <div className={`current-visibility ${currentVisibility.toLowerCase()}`}>
          <span className="visibility-icon">
            {currentVisibility === 'PUBLIC' ? '🌐' : '🔒'}
          </span>
          <div className="visibility-info">
            <strong>{getVisibilityDescription(currentVisibility).title}</strong>
            <p>{getVisibilityDescription(currentVisibility).description}</p>
          </div>
        </div>
      </div>

      {/* Privacy Options */}
      <div className="privacy-options mb-4">
        <h4>Choose Your Privacy Level</h4>
        
        <div className="visibility-options">
          {/* Public Option */}
          <label className={`visibility-option ${visibility === 'PUBLIC' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="visibility"
              value="PUBLIC"
              checked={visibility === 'PUBLIC'}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC')}
              disabled={isLoading}
            />
            <div className="option-content">
              <div className="option-header">
                <span className="option-icon">{publicInfo.icon}</span>
                <h5>{publicInfo.title}</h5>
              </div>
              <p className="option-description">{publicInfo.description}</p>
              <ul className="option-features">
                {publicInfo.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          </label>

          {/* Private Option */}
          <label className={`visibility-option ${visibility === 'PRIVATE' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="visibility"
              value="PRIVATE"
              checked={visibility === 'PRIVATE'}
              onChange={(e) => setVisibility(e.target.value as 'PRIVATE')}
              disabled={isLoading}
            />
            <div className="option-content">
              <div className="option-header">
                <span className="option-icon">{privateInfo.icon}</span>
                <h5>{privateInfo.title}</h5>
              </div>
              <p className="option-description">{privateInfo.description}</p>
              <ul className="option-features">
                {privateInfo.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="privacy-actions">
        <button
          type="button"
          onClick={handleSavePrivacySettings}
          disabled={isLoading || visibility === currentVisibility}
        >
          {isLoading ? 'Saving...' : 'Save Privacy Settings'}
        </button>
        
        <button
          type="button"
          className="outline"
          onClick={handleReset}
          disabled={isLoading || visibility === currentVisibility}
        >
          Reset
        </button>
      </div>

      {/* Important Notes */}
      <div className="privacy-notes mt-4">
        <h4>Important Notes</h4>
        <div className="notes-content">
          <div className="note-item">
            <h5>🏆 Tournament Results</h5>
            <p>
              Even with a private profile, your participation in tournaments may still be 
              visible in tournament results and standings, as these are typically public records.
            </p>
          </div>
          
          <div className="note-item">
            <h5>📊 Leaderboards</h5>
            <p>
              Private profiles appear as &quot;Private Player&quot; on leaderboards but your ranking 
              position may still be visible to maintain leaderboard integrity.
            </p>
          </div>
          
          <div className="note-item">
            <h5>🔄 Changes Take Effect Immediately</h5>
            <p>
              Privacy setting changes are applied immediately. Other users will see the 
              updated visibility right away.
            </p>
          </div>
          
          <div className="note-item">
            <h5>🆔 External Player IDs</h5>
            <p>
              Your external player IDs are never displayed publicly regardless of your 
              privacy setting. They are used only for tournament result matching.
            </p>
          </div>
        </div>
      </div>

      {/* Data Usage Information */}
      <div className="data-usage-info mt-4">
        <h4>How We Use Your Data</h4>
        <div className="usage-content">
          <p>
            We respect your privacy and only use your tournament data for the following purposes:
          </p>
          <ul>
            <li>Calculating your personal statistics and rankings</li>
            <li>Matching tournament results to your profile</li>
            <li>Generating leaderboards and seasonal rankings</li>
            <li>Providing tournament organizers with necessary participant information</li>
          </ul>
          <p>
            Your data is never sold or shared with third parties for marketing purposes.
          </p>
        </div>
      </div>
    </div>
  )
}