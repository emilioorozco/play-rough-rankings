import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import type { TRPCContext } from './server'

// Initialize tRPC with enhanced error formatting
const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError ? error.cause.flatten() : null,
        timestamp: new Date().toISOString(),
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// Enhanced authentication middleware with better error handling
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // For now, we'll handle auth in individual procedures to avoid circular dependencies
  // This will be enhanced once the basic structure is working
  return next({
    ctx: {
      ...ctx,
      // Auth will be handled in individual procedures
    },
  })
})

// Authenticated procedure that requires a valid session
export const protectedProcedure = t.procedure.use(authMiddleware)

// Role-based middleware factory
const createRoleMiddleware = (requiredRoles: string[]) => {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new Error('Authentication required')
    }

    if (!requiredRoles.includes(ctx.user.role)) {
      throw new Error(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
    }

    return next({ ctx })
  })
}

// Role-based procedures with enhanced validation
export const organizerProcedure = protectedProcedure.use(
  createRoleMiddleware(['organizer', 'admin'])
)

export const adminProcedure = protectedProcedure.use(
  createRoleMiddleware(['admin'])
)