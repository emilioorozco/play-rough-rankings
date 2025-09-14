'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from './session-provider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function UserMenu() {
  const { user, signOut } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
      router.push('/')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return { backgroundColor: 'var(--pico-primary-background)', color: 'var(--pico-primary-inverse)' }
      case 'organizer':
        return { backgroundColor: 'var(--pico-contrast-background)', color: 'var(--pico-contrast-inverse)' }
      default:
        return { backgroundColor: 'var(--pico-secondary-background)', color: 'var(--pico-secondary-inverse)' }
    }
  }

  const getMenuItems = () => {
    const items = [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/profile', label: 'Profile', icon: '👤' },
    ]

    // Add role-specific menu items
    if (user.role === 'organizer' || user.role === 'admin') {
      items.push(
        { href: '/tournaments/manage', label: 'Manage Tournaments', icon: '🏆' },
        { href: '/tournaments/create', label: 'Create Tournament', icon: '➕' }
      )
    }

    if (user.role === 'admin') {
      items.push(
        { href: '/admin', label: 'Admin Panel', icon: '⚙️' },
        { href: '/admin/users', label: 'Manage Users', icon: '👥' },
        { href: '/admin/stores', label: 'Manage Stores', icon: '🏪' }
      )
    }

    return items
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="user-menu-trigger"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{user.name || user.email}</span>
        <span className="role-badge" style={getRoleBadgeColor(user.role)}>
          {user.role}
        </span>
        <span style={{ marginLeft: '0.25rem' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-info">
            <p><strong>{user.name || 'User'}</strong></p>
            <p className="text-muted">{user.email}</p>
            <p className="role">
              Role: <span style={getRoleBadgeColor(user.role)}>{user.role}</span>
            </p>
          </div>
          
          <nav>
            {getMenuItems().map((item) => (
              // @ts-expect-error - Next.js Link href type issue
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
              >
                <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          
          <button
            onClick={handleSignOut}
            className="sign-out-button"
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  )
}