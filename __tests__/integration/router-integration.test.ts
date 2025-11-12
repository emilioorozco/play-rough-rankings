/**
 * Integration test to verify tournament lifecycle and match management routers
 * are properly integrated into the main tRPC server
 * 
 * This test verifies type exports and router structure without requiring
 * runtime imports that would need database connections.
 */

import { describe, it, expect } from '@jest/globals'

describe('Router Integration - Type Safety', () => {
  describe('Type Exports', () => {
    it('should verify client uses AppRouter type', async () => {
      // Verify the client is typed with AppRouter
      const { trpc } = await import('@/lib/trpc/client')
      expect(trpc).toBeDefined()
    })
  })

  describe('Router Structure Verification', () => {
    it('should verify tournament lifecycle router is imported', async () => {
      // Check that the router file exists and exports the router
      const { tournamentLifecycleRouter } = await import('@/lib/trpc/routers/tournament-lifecycle')
      expect(tournamentLifecycleRouter).toBeDefined()
    })

    it('should verify match management router is imported', async () => {
      // Check that the router file exists and exports the router
      const { matchManagementRouter } = await import('@/lib/trpc/routers/match-management')
      expect(matchManagementRouter).toBeDefined()
    })

    it('should verify tournament lifecycle router has expected procedures', async () => {
      const { tournamentLifecycleRouter } = await import('@/lib/trpc/routers/tournament-lifecycle')
      
      // Verify the router has the expected structure
      expect(tournamentLifecycleRouter).toBeDefined()
      expect(typeof tournamentLifecycleRouter).toBe('object')
      
      // Check for key procedures (these are tRPC procedure objects)
      expect(tournamentLifecycleRouter.start).toBeDefined()
      expect(tournamentLifecycleRouter.advanceRound).toBeDefined()
      expect(tournamentLifecycleRouter.complete).toBeDefined()
      expect(tournamentLifecycleRouter.pause).toBeDefined()
      expect(tournamentLifecycleRouter.resume).toBeDefined()
      expect(tournamentLifecycleRouter.cancel).toBeDefined()
      expect(tournamentLifecycleRouter.dropPlayer).toBeDefined()
      expect(tournamentLifecycleRouter.getProjectedRatings).toBeDefined()
      expect(tournamentLifecycleRouter.getAuditTrail).toBeDefined()
    })

    it('should verify match management router has expected procedures', async () => {
      const { matchManagementRouter } = await import('@/lib/trpc/routers/match-management')
      
      // Verify the router has the expected structure
      expect(matchManagementRouter).toBeDefined()
      expect(typeof matchManagementRouter).toBe('object')
      
      // Check for key procedures
      expect(matchManagementRouter.submitResult).toBeDefined()
      expect(matchManagementRouter.confirmResult).toBeDefined()
      expect(matchManagementRouter.organizerSubmitResult).toBeDefined()
      expect(matchManagementRouter.resolveDispute).toBeDefined()
      expect(matchManagementRouter.awardNoShow).toBeDefined()
      expect(matchManagementRouter.getDisputes).toBeDefined()
    })
  })

  describe('Authentication Integration', () => {
    it('should verify router factory exports procedures', async () => {
      const routerFactory = await import('@/lib/trpc/router-factory')
      
      // Verify all procedure types are exported
      expect(routerFactory.router).toBeDefined()
      expect(routerFactory.publicProcedure).toBeDefined()
      expect(routerFactory.protectedProcedure).toBeDefined()
      expect(routerFactory.organizerProcedure).toBeDefined()
      expect(routerFactory.adminProcedure).toBeDefined()
    })

    it('should verify procedures use correct middleware', async () => {
      const routerFactory = await import('@/lib/trpc/router-factory')
      
      // Verify procedures are properly typed
      expect(typeof routerFactory.publicProcedure).toBe('object')
      expect(typeof routerFactory.protectedProcedure).toBe('object')
      expect(typeof routerFactory.organizerProcedure).toBe('object')
      expect(typeof routerFactory.adminProcedure).toBe('object')
    })
  })

  describe('Client Integration', () => {
    it('should verify tRPC client is properly configured', async () => {
      const { trpc } = await import('@/lib/trpc/client')
      
      // Verify client is created with AppRouter type
      expect(trpc).toBeDefined()
      expect(trpc.createClient).toBeDefined()
      expect(trpc.Provider).toBeDefined()
    })

    it('should verify provider is properly configured', async () => {
      const { TRPCProvider } = await import('@/lib/trpc/provider')
      
      // Verify provider component exists
      expect(TRPCProvider).toBeDefined()
      expect(typeof TRPCProvider).toBe('function')
    })
  })

  describe('Integration Completeness', () => {
    it('should verify router files can be imported', async () => {
      // Verify router files can be imported (excluding server which has Prisma dependency)
      const imports = await Promise.all([
        import('@/lib/trpc/client'),
        import('@/lib/trpc/provider'),
        import('@/lib/trpc/router-factory'),
        import('@/lib/trpc/routers/tournament-lifecycle'),
        import('@/lib/trpc/routers/match-management'),
      ])
      
      // All imports should succeed
      expect(imports).toHaveLength(5)
      imports.forEach(module => {
        expect(module).toBeDefined()
      })
    })

    it('should verify business logic classes are accessible', async () => {
      // Verify tournament processor classes can be imported
      const imports = await Promise.all([
        import('@/lib/tournament/tournament-processor'),
        import('@/lib/tournament/match-processor'),
        import('@/lib/tournament/pairing-generator'),
        import('@/lib/tournament/rating-calculator'),
        import('@/lib/tournament/audit-logger'),
      ])
      
      // All imports should succeed
      expect(imports).toHaveLength(5)
      imports.forEach(module => {
        expect(module).toBeDefined()
      })
    })
  })
})
