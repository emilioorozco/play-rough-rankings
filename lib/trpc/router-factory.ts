import { initTRPC, TRPCError } from '@trpc/server'
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

// Enhanced authentication middleware with proper validation
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Ensure user is available in context
    },
  })
})

// Authenticated procedure that requires a valid session
export const protectedProcedure = t.procedure.use(authMiddleware)

// Role-based middleware factory
const createRoleMiddleware = (requiredRoles: string[]) => {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }

    // Admin can access everything
    if (ctx.user.role === 'admin') {
      return next({ ctx })
    }

    // Check if user role is in the required roles
    if (!requiredRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Access denied. Required roles: ${requiredRoles.join(', ')}, or admin`,
      })
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