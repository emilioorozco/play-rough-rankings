'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreateStoreSchema } from '@/lib/schemas'
import { trpc } from '@/lib/trpc/client'
import { Modal } from '@/components/ui/modal'
import { ModalForm } from '@/components/ui/form-components'
import { FormField } from '@/components/ui/form-components'
import { Input } from '@/components/ui/input'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { Store, MapPin, Mail, Globe } from 'lucide-react'
import { z } from 'zod'

type StoreCreateFormData = z.infer<typeof CreateStoreSchema>

interface StoreCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function StoreCreateModal({ isOpen, onClose, onSuccess }: StoreCreateModalProps) {
  const createStore = trpc.stores.create.useMutation()
  const utils = trpc.useUtils()
  
  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formId = 'store-create'
  
  // Form draft store actions
  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    createDraft,
    validateDraftData,
  } = useFormDraftStore()

  // Form data state
  const [formData, setFormData] = useState<StoreCreateFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    contactEmail: undefined,
    website: undefined,
    isActive: true,
  })

  // Load draft on mount
  useEffect(() => {
    if (hasDraft(formId)) {
      const draftData = loadDraft(formId)
      if (draftData) {
        setFormData(draftData)
      }
    } else {
      // Create initial draft
      const draftId = createDraft('store-create', formData)
    }
  }, [formId, hasDraft, loadDraft, createDraft])

  // Auto-save functionality (optional for modal)
  const autoSave = useCallback(() => {
    if (Object.values(formData).some(value => value !== '' && value !== undefined)) {
      saveDraft(formId, formData)
    }
  }, [formData, formId, saveDraft])

  // Auto-save on form data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave()
    }, 2000) // 2 second delay

    return () => clearTimeout(timer)
  }, [autoSave])

  // Update form field
  const updateField = (field: keyof StoreCreateFormData, value: any) => {
    // Convert empty strings to undefined for optional fields
    let processedValue = value
    if ((field === 'contactEmail' || field === 'website') && value === '') {
      processedValue = undefined
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Validation
  const validateForm = (data: StoreCreateFormData) => {
    try {
      CreateStoreSchema.parse(data)
      return { isValid: true, errors: {} }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach(issue => {
          const field = issue.path[0] as string
          if (field) {
            fieldErrors[field] = issue.message
          }
        })
        return { isValid: false, errors: fieldErrors }
      }
      return { isValid: false, errors: { general: 'Validation failed' } }
    }
  }

  const isFormValid = () => {
    return formData.name && formData.address && formData.city && 
           formData.state && formData.zipCode
  }

  const isDirty = () => {
    return Object.values(formData).some(value => value !== '' && value !== undefined)
  }

  // Submit form
  const handleSubmit = async () => {
    const validation = validateForm(formData)
    
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await createStore.mutateAsync(formData)
      await utils.stores.list.invalidate()
      
      // Clear draft on successful creation
      clearDraft(formId)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Store creation error:', error)
      setErrors({ general: error instanceof Error ? error.message : 'Store creation failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      contactEmail: undefined,
      website: undefined,
      isActive: true,
    })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add New Store"
      description="Create a new tournament venue for your platform"
      size="lg"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      isValid={!!isFormValid()}
      isDirty={isDirty()}
      submitLabel="Create Store"
      cancelLabel="Cancel"
      showCancel={true}
      useFormSubmission={false}
      error={errors.general || createStore.error?.message || undefined}
    >
      <ModalForm>
        <div className="space-y-6">
          {/* Store Name */}
          <FormField
            label="Store Name"
            error={errors.name}
            required
          >
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter store name"
                value={formData.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Address */}
          <FormField
            label="Address"
            error={errors.address}
            required
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter street address"
                value={formData.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* City, State, ZIP Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="City"
              error={errors.city}
              required
            >
              <Input
                type="text"
                placeholder="City"
                value={formData.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </FormField>

            <FormField
              label="State"
              error={errors.state}
              required
            >
              <Input
                type="text"
                placeholder="State"
                value={formData.state || ''}
                onChange={(e) => updateField('state', e.target.value)}
              />
            </FormField>

            <FormField
              label="ZIP Code"
              error={errors.zipCode}
              required
            >
              <Input
                type="text"
                placeholder="12345 or 12345-6789"
                value={formData.zipCode || ''}
                onChange={(e) => updateField('zipCode', e.target.value)}
              />
            </FormField>
          </div>

          {/* Contact Email */}
          <FormField
            label="Contact Email"
            error={errors.contactEmail}
            description="Optional contact email for the store"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="contact@store.com"
                value={formData.contactEmail || ''}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Website */}
          <FormField
            label="Website"
            error={errors.website}
            description="Optional website URL for the store"
          >
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://www.store.com"
                value={formData.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>
        </div>
      </ModalForm>
    </Modal>
  )
}