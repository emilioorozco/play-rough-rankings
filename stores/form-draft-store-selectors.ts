import { useMemo, useRef } from 'react'
import { useFormDraftStore } from './form-draft-store'

// Stable empty object to prevent infinite loops
const EMPTY_OBJECT: Record<string, any> = {}

// Individual draft selectors - all are custom hooks
export const useDraft = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId])
}

export const useDraftData = (draftId: string) => {
  const data = useFormDraftStore((state) => state.drafts[draftId]?.data)
  console.log('[useDraftData]', { draftId, data })
  return data
}

// FormId-based selectors that search by metadata.formId
export const useDraftByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    console.log('[useDraftByFormId]', { formId, foundDraftId: foundDraft?.id, found: !!foundDraft })
    return foundDraft || null
  })
}

export const useDraftIdByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    const draftId = foundDraft?.id || null
    console.log('[useDraftIdByFormId]', { formId, resolvedDraftId: draftId })
    return draftId
  })
}

export const useDraftDataByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    console.log('[useDraftDataByFormId]', { formId, foundDraftId: foundDraft?.id, hasData: !!foundDraft?.data })
    return foundDraft?.data || null
  })
}

export const useDraftErrorsByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    return foundDraft?.errors || EMPTY_OBJECT
  })
}

export const useIsDraftDirtyByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    return foundDraft?.isDirty || false
  })
}

export const useDraftTouchedFieldsByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    return foundDraft?.touchedFields || EMPTY_OBJECT
  })
}

export const useDraftSubmitAttemptedByFormId = (formId: string) => {
  return useFormDraftStore((state) => {
    const drafts = Object.values(state.drafts)
    const foundDraft = drafts.find((draft: any) => draft?.metadata?.formId === formId)
    return foundDraft?.submitAttempted || false
  })
}

export const useDraftMetadata = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.metadata)
}

export const useDraftLastUpdated = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.lastUpdated)
}

export const useHasDraft = (draftId: string) => {
  return useFormDraftStore((state) => !!state.drafts[draftId])
}

export const useIsDraftDirty = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.isDirty || false)
}

export const useIsDraftValid = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.isValid || false)
}

export const useDraftErrors = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.errors || EMPTY_OBJECT)
}

export const useDraftTouchedFields = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.touchedFields || EMPTY_OBJECT)
}

export const useDraftSubmitAttempted = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.submitAttempted || false)
}

export const useDraftCurrentStep = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.currentStep || 0)
}

export const useDraftTotalSteps = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.totalSteps || 1)
}

export const useDraftFormType = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.formType)
}

export const useDraftUserId = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.userId)
}

export const useDraftSessionId = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.sessionId)
}

export const useIsDraftExpired = (draftId: string) => {
  return useFormDraftStore((state) => {
    const draft = state.drafts[draftId]
    if (!draft?.expiresAt) return false
    return new Date() > new Date(draft.expiresAt)
  })
}

export const useDraftExpiration = (draftId: string) => {
  return useFormDraftStore((state) => state.drafts[draftId]?.expiresAt)
}

// Draft list custom hooks
export const useAllDrafts = () => {
  return useFormDraftStore((state) => Object.values(state.drafts))
}

export const useDraftsByFormType = (formType: string) => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.formType === formType)
  )
}

export const useDraftsByUserId = (userId: string) => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.userId === userId)
  )
}

export const useDraftsBySessionId = (sessionId: string) => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.sessionId === sessionId)
  )
}

export const useDirtyDrafts = () => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.isDirty)
  )
}

export const useExpiredDrafts = () => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => {
      if (!draft.expiresAt) return false
      return new Date() > new Date(draft.expiresAt)
    })
  )
}

export const useValidDrafts = () => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.isValid)
  )
}

export const useDraftCount = () => {
  return useFormDraftStore((state) => Object.keys(state.drafts).length)
}

export const useDraftCountByFormType = (formType: string) => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.formType === formType).length
  )
}

export const useDraftCountByUserId = (userId: string) => {
  return useFormDraftStore((state) => 
    Object.values(state.drafts).filter(draft => draft.userId === userId).length
  )
}

// Draft management custom hooks
export const useDraftStats = () => {
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
}

export const useDraftSummary = () => {
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
}

export const useDraftHealth = () => {
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
}

// Action hooks - stable reference to prevent infinite loops
export const useFormDraftActions = () => {
  const actionsRef = useRef<{
    createDraft: (formType: string, initialData: Record<string, any>, metadata?: any) => string
    updateDraft: (draftId: string, updates: any) => void
    saveDraft: (formId: string, data: any) => void
    loadDraft: (formId: string) => any | null
    deleteDraft: (draftId: string) => void
    clearDraft: (formId: string) => void
    clearDrafts: (formType?: string) => void
    validateDraft: (draftId: string) => { isValid: boolean; errors: Record<string, string> }
    updateDraftStep: (draftId: string, step: number) => void
    setDraftMetadata: (formType: string, metadata: any) => void
    exportDraft: (draftId: string) => string
    importDraft: (draftData: string) => string
    cleanupExpiredDrafts: () => void
    markFieldTouched: (draftId: string, field: string) => void
    markSubmitAttempted: (draftId: string) => void
    resetTouchedState: (draftId: string) => void
  } | null>(null)
  
  if (!actionsRef.current) {
    const state = useFormDraftStore.getState()
    actionsRef.current = {
      createDraft: state.createDraft,
      updateDraft: state.updateDraft,
      saveDraft: state.saveDraft,
      loadDraft: state.loadDraft,
      deleteDraft: state.deleteDraft,
      clearDraft: state.clearDraft,
      clearDrafts: state.clearDrafts,
      validateDraft: state.validateDraft,
      updateDraftStep: state.updateDraftStep,
      setDraftMetadata: state.setDraftMetadata,
      exportDraft: state.exportDraft,
      importDraft: state.importDraft,
      cleanupExpiredDrafts: state.cleanupExpiredDrafts,
      markFieldTouched: state.markFieldTouched,
      markSubmitAttempted: state.markSubmitAttempted,
      resetTouchedState: state.resetTouchedState,
    }
  }
  
  // Non-null assertion since we initialize it above
  return actionsRef.current!
}

// Combined hooks for common use cases
export const useDraftState = (draftId: string) => {
  const draft = useDraft(draftId)
  const hasDraft = useHasDraft(draftId)
  const isDirty = useIsDraftDirty(draftId)
  const isValid = useIsDraftValid(draftId)
  const errors = useDraftErrors(draftId)
  const lastUpdated = useDraftLastUpdated(draftId)
  const isExpired = useIsDraftExpired(draftId)
  const actions = useFormDraftActions()

  return useMemo(() => ({
    draft: draft || null,
    hasDraft,
    isDirty,
    isValid,
    errors,
    lastUpdated,
    isExpired,
    updateDraft: (data: any) => actions.updateDraft(draftId, data),
    saveDraft: (data: any) => actions.saveDraft(draftId, data),
    deleteDraft: () => actions.deleteDraft(draftId),
    clearDraft: () => actions.clearDraft(draftId),
  }), [draft, hasDraft, isDirty, isValid, errors, lastUpdated, isExpired, draftId, actions])
}

export const useDraftListState = () => {
  const drafts = useAllDrafts()
  const stats = useDraftStats()
  const summary = useDraftSummary()
  const health = useDraftHealth()
  const actions = useFormDraftActions()

  return useMemo(() => ({
    drafts,
    stats,
    summary,
    health,
    clearAll: () => actions.clearDrafts(),
    clearExpired: () => actions.cleanupExpiredDrafts(),
  }), [drafts, stats, summary, health, actions])
}

// Performance-optimized hooks for specific use cases
export const useDraftCardData = (draftId: string) => {
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
}

export const useDraftListRenderData = () => {
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
}

export const useDraftStatusData = (draftId: string) => {
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
}

export const useDraftManagementRenderData = () => {
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
}
