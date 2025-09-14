'use client'

import { useState } from 'react'
import { useSession } from './session-provider'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const { signIn } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSignUp, setShowSignUp] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const result = showSignUp 
        ? await signIn.email({
            email,
            password,
          })
        : await signIn.email({
            email,
            password,
          })

      if (result.error) {
        setError(result.error.message || 'Authentication failed')
      } else {
        // Redirect to dashboard after successful auth
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      setError((error as Error).message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'discord' | 'github') => {
    setIsLoading(true)
    setError(null)
    
    try {
      await signIn.social({
        provider,
        callbackURL: '/dashboard',
      })
    } catch (error: unknown) {
      setError((error as Error).message || 'Social login failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <header className="text-center mb-3">
        <h1 className="brand-title">Play Rough Rankings</h1>
        <h2>{showSignUp ? 'Create Account' : 'Sign In'}</h2>
        <p>Track your tournament performance and climb the leaderboards</p>
      </header>

      {error && (
        <div className="error-message mb-2" style={{ 
          padding: '0.75rem', 
          backgroundColor: 'var(--pico-primary-focus)', 
          border: '1px solid var(--pico-primary-border)',
          borderRadius: 'var(--pico-border-radius)',
          color: 'var(--pico-primary)',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      
      {/* Email/Password Auth */}
      <form onSubmit={handleEmailAuth}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="your@email.com"
          />
        </label>
        
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your password"
            minLength={6}
          />
        </label>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Please wait...' : (showSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div className="divider">
        <span>or</span>
      </div>

      {/* Social Login Buttons */}
      <div className="social-login">
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={isLoading}
          className="social-button google"
        >
          Continue with Google
        </button>
        
        <button
          onClick={() => handleSocialLogin('discord')}
          disabled={isLoading}
          className="social-button discord"
        >
          Continue with Discord
        </button>
        
        <button
          onClick={() => handleSocialLogin('github')}
          disabled={isLoading}
          className="social-button github"
        >
          Continue with GitHub
        </button>
      </div>

      <div className="text-center mt-3">
        <button
          type="button"
          onClick={() => setShowSignUp(!showSignUp)}
          className="link-button"
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pico-primary)',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          {showSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}