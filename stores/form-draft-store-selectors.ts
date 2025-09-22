import { useMemo, useCallback } from 'react'
import { useFormDraftStore } from './form-draft-store'
import type { FormDraftState } from './form-draft-store'

// Stable empty object to prevent infinite loops
const EMPTY_OBJECT: Record<string, any> = {}

// Draft selectors
export const useDraftSelectors = {
  // Get specific draft
  getDraft: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId])
  },

  // Get draft data
  getDraftData: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.data)
  },

  // Get draft metadata
  getDraftMetadata: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.metadata)
  },

  // Get draft last updated time
  getDraftLastUpdated: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.lastUpdated)
  },

  // Check if draft exists
  hasDraft: (draftId: string) => {
    return useFormDraftStore((state) => !!state.drafts[draftId])
  },

  // Check if draft is dirty
  isDraftDirty: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.isDirty || false)
  },

  // Check if draft is valid
  isDraftValid: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.isValid || false)
  },

  // Get draft errors - memoized to prevent infinite loops
  getDraftErrors: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.errors || EMPTY_OBJECT)
  },

  // Get draft current step
  getDraftCurrentStep: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.currentStep || 0)
  },

  // Get draft total steps
  getDraftTotalSteps: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.totalSteps || 1)
  },

  // Get draft form type
  getDraftFormType: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.formType)
  },

  // Get draft user ID
  getDraftUserId: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.userId)
  },

  // Get draft session ID
  getDraftSessionId: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.sessionId)
  },

  // Check if draft is expired
  isDraftExpired: (draftId: string) => {
    return useFormDraftStore((state) => {
      const draft = state.drafts[draftId]
      if (!draft?.expiresAt) return false
      return new Date() > new Date(draft.expiresAt)
    })
  },

  // Get draft expiration time
  getDraftExpiration: (draftId: string) => {
    return useFormDraftStore((state) => state.drafts[draftId]?.expiresAt)
  },
}

// Draft list selectors
export const useDraftListSelectors = {
  // Get all drafts
  getAllDrafts: () => {
    return useFormDraftStore((state) => Object.values(state.drafts))
  },

  // Get drafts by form type
  getDraftsByFormType: (formType: string) => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.formType === formType)
    )
  },

  // Get drafts by user ID
  getDraftsByUserId: (userId: string) => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.userId === userId)
    )
  },

  // Get drafts by session ID
  getDraftsBySessionId: (sessionId: string) => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.sessionId === sessionId)
    )
  },

  // Get dirty drafts
  getDirtyDrafts: () => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.isDirty)
    )
  },

  // Get expired drafts
  getExpiredDrafts: () => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => {
        if (!draft.expiresAt) return false
        return new Date() > new Date(draft.expiresAt)
      })
    )
  },

  // Get valid drafts
  getValidDrafts: () => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.isValid)
    )
  },

  // Get draft count
  getDraftCount: () => {
    return useFormDraftStore((state) => Object.keys(state.drafts).length)
  },

  // Get draft count by form type
  getDraftCountByFormType: (formType: string) => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.formType === formType).length
    )
  },

  // Get draft count by user ID
  getDraftCountByUserId: (userId: string) => {
    return useFormDraftStore((state) => 
      Object.values(state.drafts).filter(draft => draft.userId === userId).length
    )
  },
}

// Draft management selectors
export const useDraftManagementSelectors = {
  // Get draft statistics
  getDraftStats: () => {
    return useFormDraftStore((state) => {
      const drafts = Object.values(state.drafts)
      const total = drafts.length
      const dirty = drafts.filter(draft => draft.isDirty).length
      const valid = drafts.filter(draft => draft.isValid).length
      const expired = drafts.filter(draft => {
        if (!draft.expiresAt) return false
        return new Date() > new Date(draft.expiresAt)
      }).length

      return {
        total,
        dirty,
        valid,
        expired,
        clean: total - dirty,
        invalid: total - valid,
        active: total - expired,
      }
    })
  },

  // Get draft summary
  getDraftSummary: () => {
    return useFormDraftStore((state) => {
      const drafts = Object.values(state.drafts)
      const formTypes = [...new Set(drafts.map(draft => draft.formType))]
      const users = [...new Set(drafts.map(draft => draft.userId).filter(Boolean))]
      const sessions = [...new Set(drafts.map(draft => draft.sessionId).filter(Boolean))]

      return {
        totalDrafts: drafts.length,
        formTypes,
        uniqueUsers: users.length,
        uniqueSessions: sessions.length,
        oldestDraft: drafts.length > 0 ? Math.min(...drafts.map(draft => draft.lastUpdated.getTime())) : null,
        newestDraft: drafts.length > 0 ? Math.max(...drafts.map(draft => draft.lastUpdated.getTime())) : null,
      }
    })
  },

  // Get draft health status
  getDraftHealth: () => {
    return useFormDraftStore((state) => {
      const drafts = Object.values(state.drafts)
      const total = drafts.length
      
      if (total === 0) return 'healthy'
      
      const expired = drafts.filter(draft => {
        if (!draft.expiresAt) return false
        return new Date() > new Date(draft.expiresAt)
      }).length
      
      const expiredPercentage = (expired / total) * 100
      
      if (expiredPercentage > 50) return 'critical'
      if (expiredPercentage > 25) return 'warning'
      return 'healthy'
    })
  },
}

// Action selectors
export const useFormDraftActions = {
  // Create draft
  createDraft: () => useFormDraftStore((state) => state.createDraft),

  // Update draft
  updateDraft: () => useFormDraftStore((state) => state.updateDraft),

  // Save draft
  saveDraft: () => useFormDraftStore((state) => state.saveDraft),

  // Load draft
  loadDraft: () => useFormDraftStore((state) => state.loadDraft),

  // Delete draft
  deleteDraft: () => useFormDraftStore((state) => state.deleteDraft),

  // Clear draft
  clearDraft: () => useFormDraftStore((state) => state.clearDraft),

  // Clear all drafts
  clearAllDrafts: () => useFormDraftStore((state) => state.clearAllDrafts),

  // Clear drafts by form type
  clearDraftsByFormType: () => useFormDraftStore((state) => state.clearDraftsByFormType),

  // Clear drafts by user ID
  clearDraftsByUserId: () => useFormDraftStore((state) => state.clearDraftsByUserId),

  // Clear expired drafts
  clearExpiredDrafts: () => useFormDraftStore((state) => state.clearExpiredDrafts),

  // Validate draft
  validateDraft: () => useFormDraftStore((state) => state.validateDraft),

  // Set draft step
  setDraftStep: () => useFormDraftStore((state) => state.setDraftStep),

  // Set draft metadata
  setDraftMetadata: () => useFormDraftStore((state) => state.setDraftMetadata),

  // Export draft
  exportDraft: () => useFormDraftStore((state) => state.exportDraft),

  // Import draft
  importDraft: () => useFormDraftStore((state) => state.importDraft),
}

// Combined selectors for common use cases
export const useFormDraftStoreSelectors = {
  // Get complete draft state for a specific draft
  getDraftState: (draftId: string) => {
    const draft = useDraftSelectors.getDraft(draftId)
    const hasDraft = useDraftSelectors.hasDraft(draftId)
    const isDirty = useDraftSelectors.isDraftDirty(draftId)
    const isValid = useDraftSelectors.isDraftValid(draftId)
    const errors = useDraftSelectors.getDraftErrors(draftId)
    const lastUpdated = useDraftSelectors.getDraftLastUpdated(draftId)
    const isExpired = useDraftSelectors.isDraftExpired(draftId)
    
    const updateDraft = useFormDraftActions.updateDraft()
    const saveDraft = useFormDraftActions.saveDraft()
    const deleteDraft = useFormDraftActions.deleteDraft()
    const clearDraft = useFormDraftActions.clearDraft()

    return useMemo(() => ({
      draft: draft || null,
      hasDraft,
      isDirty,
      isValid,
      errors,
      lastUpdated,
      isExpired,
      updateDraft: (data: any) => updateDraft(draftId, data),
      saveDraft: (data: any) => saveDraft(draftId, data),
      deleteDraft: () => deleteDraft(draftId),
      clearDraft: () => clearDraft(draftId),
    }), [draft, hasDraft, isDirty, isValid, errors, lastUpdated, isExpired, draftId]) // Removed function references to prevent infinite loops
  },

  // Get complete draft list state
  getDraftListState: () => {
    const drafts = useDraftListSelectors.getAllDrafts()
    const stats = useDraftManagementSelectors.getDraftStats()
    const summary = useDraftManagementSelectors.getDraftSummary()
    const health = useDraftManagementSelectors.getDraftHealth()
    
    const clearAllDrafts = useFormDraftActions.clearAllDrafts()
    const clearExpiredDrafts = useFormDraftActions.clearExpiredDrafts()

    return useMemo(() => ({
      drafts,
      stats,
      summary,
      health,
      clearAll: () => clearAllDrafts(),
      clearExpired: () => clearExpiredDrafts(),
    }), [drafts, stats, summary, health]) // Removed function references to prevent infinite loops
  },

  // Get complete draft management state
  getDraftManagementState: () => {
    const stats = useDraftManagementSelectors.getDraftStats()
    const summary = useDraftManagementSelectors.getDraftSummary()
    const health = useDraftManagementSelectors.getDraftHealth()
    
    const clearAllDrafts = useFormDraftActions.clearAllDrafts()
    const clearExpiredDrafts = useFormDraftActions.clearExpiredDrafts()
    const clearDraftsByFormType = useFormDraftActions.clearDraftsByFormType()
    const clearDraftsByUserId = useFormDraftActions.clearDraftsByUserId()

    return useMemo(() => ({
      stats,
      summary,
      health,
      clearAll: () => clearAllDrafts(),
      clearExpired: () => clearExpiredDrafts(),
      clearByFormType: (formType: string) => clearDraftsByFormType(formType),
      clearByUserId: (userId: string) => clearDraftsByUserId(userId),
    }), [stats, summary, health]) // Removed function references to prevent infinite loops
  },
}

// Performance-optimized selectors for specific use cases
export const useOptimizedFormDraftSelectors = {
  // Get only the data needed for draft card rendering
  getDraftCardData: (draftId: string) => {
    return useFormDraftStore((state) => {
      const draft = state.drafts[draftId]
      if (!draft) return null
      
      return {
        id: draft.id,
        formType: draft.formType,
        lastUpdated: draft.lastUpdated,
        isDirty: draft.isDirty,
        isValid: draft.isValid,
        currentStep: draft.currentStep,
        totalSteps: draft.totalSteps,
        isExpired: draft.expiresAt ? new Date() > new Date(draft.expiresAt) : false,
      }
    })
  },

  // Get only the data needed for draft list rendering
  getDraftListRenderData: () => {
    return useFormDraftStore((state) => {
      const drafts = Object.values(state.drafts)
      return {
        drafts: drafts.map(draft => ({
          id: draft.id,
          formType: draft.formType,
          lastUpdated: draft.lastUpdated,
          isDirty: draft.isDirty,
          isValid: draft.isValid,
          currentStep: draft.currentStep,
          totalSteps: draft.totalSteps,
        })),
        totalCount: drafts.length,
        dirtyCount: drafts.filter(draft => draft.isDirty).length,
        validCount: drafts.filter(draft => draft.isValid).length,
      }
    })
  },

  // Get only the data needed for draft status rendering
  getDraftStatusData: (draftId: string) => {
    return useFormDraftStore((state) => {
      const draft = state.drafts[draftId]
      if (!draft) return null
      
      return {
        isDirty: draft.isDirty,
        isValid: draft.isValid,
        hasErrors: Object.keys(draft.errors || {}).length > 0,
        errorCount: Object.keys(draft.errors || {}).length,
        lastUpdated: draft.lastUpdated,
        isExpired: draft.expiresAt ? new Date() > new Date(draft.expiresAt) : false,
      }
    })
  },

  // Get only the data needed for draft management rendering
  getDraftManagementRenderData: () => {
    return useFormDraftStore((state) => {
      const drafts = Object.values(state.drafts)
      const total = drafts.length
      const dirty = drafts.filter(draft => draft.isDirty).length
      const valid = drafts.filter(draft => draft.isValid).length
      const expired = drafts.filter(draft => {
        if (!draft.expiresAt) return false
        return new Date() > new Date(draft.expiresAt)
      }).length
      
      return {
        total,
        dirty,
        valid,
        expired,
        clean: total - dirty,
        invalid: total - valid,
        active: total - expired,
        health: total === 0 ? 'healthy' : expired / total > 0.5 ? 'critical' : expired / total > 0.25 ? 'warning' : 'healthy',
      }
    })
  },
}
