import { z } from 'zod'

// Common validation patterns
export const emailSchema = z.string().email('Please enter a valid email address')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
export const nameSchema = z.string().min(1, 'This field is required').max(50, 'Name must be less than 50 characters')
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number').optional()

// User and authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  firstName: nameSchema,
  lastName: nameSchema,
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  subscribeToUpdates: z.boolean().optional(),
  nameDisplayPreference: z.enum(['FIRST_NAME', 'FIRST_LAST_NAME', 'DISPLAY_NAME', 'OPT_OUT']).optional(),
  optInCommunications: z.boolean().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  location: z.string().optional(),
  phone: phoneSchema,
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
})

export const profileCompletionSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  location: z.string().optional(),
  favoriteGame: z.string().optional(),
})

// Tournament schemas
export const tournamentCreateSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  gameId: z.string().uuid('Please select a valid game'),
  storeId: z.string().uuid('Please select a valid store'),
  date: z.string().min(1, 'Date is required'),
  format: z.string().min(1, 'Format is required'),
  maxPlayers: z.string().refine(val => {
    const num = parseInt(val)
    return !isNaN(num) && num > 0 && num <= 1000
  }, 'Max players must be between 1 and 1000'),
  entryFee: z.string().refine(val => {
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'Entry fee must be a valid number'),
  prizePool: z.string().refine(val => {
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, 'Prize pool must be a valid number'),
  tournamentLevel: z.enum(['LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL']),
})

export const tournamentRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  deckArchetype: z.string().min(1, 'Please select a deck archetype'),
  deckList: z.string().optional(),
  shareDeckList: z.boolean(),
  agreesToConduct: z.boolean().refine(val => val === true, 'You must agree to the code of conduct'),
})

// User preferences schemas
export const userPreferencesSchema = z.object({
  nameDisplayPreference: z.enum(['FIRST_NAME', 'FIRST_LAST_NAME', 'DISPLAY_NAME', 'OPT_OUT']),
  profileVisibility: z.enum(['PUBLIC', 'PRIVATE']),
  optInCommunications: z.boolean(),
  optInTournamentUpdates: z.boolean(),
  optInLeaderboardUpdates: z.boolean(),
  optInMarketing: z.boolean(),
})

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['tournaments', 'players', 'all']).optional(),
  filters: z.record(z.any()).optional(),
})

// Contact form schema
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be less than 100 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
})

// Feedback schema
export const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

// Utility functions for validation
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success
}

export function validateName(name: string): boolean {
  return nameSchema.safeParse(name).success
}

// Form validation helpers
export function getFieldError<T>(errors: Record<keyof T, string>, field: keyof T): string | undefined {
  return errors[field] || undefined
}

export function hasFieldError<T>(errors: Record<keyof T, string>, field: keyof T): boolean {
  return !!errors[field]
}

export function hasAnyErrors<T>(errors: Record<keyof T, string>): boolean {
  return Object.values(errors).some(error => !!error)
}

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>
export type ProfileCompletionFormData = z.infer<typeof profileCompletionSchema>
export type TournamentCreateFormData = z.infer<typeof tournamentCreateSchema>
export type TournamentRegistrationFormData = z.infer<typeof tournamentRegistrationSchema>
export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>
export type SearchFormData = z.infer<typeof searchSchema>
export type ContactFormData = z.infer<typeof contactSchema>
export type FeedbackFormData = z.infer<typeof feedbackSchema>
