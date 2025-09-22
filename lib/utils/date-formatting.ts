/**
 * Date formatting utilities for tournament display
 */

/**
 * Validates if a date is valid
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Creates a safe date from various input types
 */
export function createSafeDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) {
    return new Date(); // Return current date as fallback
  }
  
  const date = new Date(dateInput);
  return isValidDate(date) ? date : new Date(); // Return current date if invalid
}

export function formatDate(date: Date): string {
  if (!isValidDate(date)) {
    return 'Date TBD';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(date: Date): string {
  if (!isValidDate(date)) {
    return 'Time TBD';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatDateShort(date: Date): string {
  if (!isValidDate(date)) {
    return 'Date TBD';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatTimeShort(date: Date): string {
  if (!isValidDate(date)) {
    return 'Time TBD';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function isToday(date: Date): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export function isTomorrow(date: Date): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return date.toDateString() === tomorrow.toDateString()
}

export function isThisWeek(date: Date): boolean {
  if (!isValidDate(date)) {
    return false;
  }
  
  const today = new Date()
  const weekFromNow = new Date()
  weekFromNow.setDate(today.getDate() + 7)
  
  return date >= today && date <= weekFromNow
}

export function getRelativeTimeString(date: Date): string {
  if (!isValidDate(date)) {
    return 'Date TBD';
  }
  
  const now = new Date()
  const diffInMs = date.getTime() - now.getTime()
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
  
  if (isToday(date)) {
    return 'Today'
  } else if (isTomorrow(date)) {
    return 'Tomorrow'
  } else if (diffInDays > 0 && diffInDays <= 7) {
    return `In ${diffInDays} day${diffInDays > 1 ? 's' : ''}`
  } else if (diffInDays < 0 && diffInDays >= -7) {
    return `${Math.abs(diffInDays)} day${Math.abs(diffInDays) > 1 ? 's' : ''} ago`
  } else {
    return formatDateShort(date)
  }
}