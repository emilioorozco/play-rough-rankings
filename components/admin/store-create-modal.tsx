'use client'

import React from 'react'
import { CreateStoreSchema } from '@/lib/schemas'
import { trpc } from '@/lib/trpc/client'
import { Modal } from '@/components/ui/modal'
import { ModalForm } from '@/components/ui/form-components'
import { FormField } from '@/components/ui/form-components'
import { Input } from '@/components/ui/input'
import { useSimpleZustandForm } from '@/hooks/use-form-zustand'
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
  
  // Form state using Zustand-based system
  const formState = useSimpleZustandForm<StoreCreateFormData>({
    initialData: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      contactEmail: undefined,
      website: undefined,
      isActive: true,
    },
    validationSchema: CreateStoreSchema,
    onSubmit: async (data) => {
      await createStore.mutateAsync(data)
      await utils.stores.list.invalidate()
      onSuccess?.()
      onClose()
    },
    onSuccess: () => {
      console.log('Store created successfully')
    },
    onError: (error) => {
      console.error('Store creation error:', error)
    },
    showLoadingBar: true,
  })

  // Update form field with processing for optional fields
  const updateField = (field: keyof StoreCreateFormData, value: any) => {
    // Convert empty strings to undefined for optional fields
    let processedValue = value
    if ((field === 'contactEmail' || field === 'website') && value === '') {
      processedValue = undefined
    }
    
    formState.setField(field, processedValue)
  }

  const handleCancel = () => {
    formState.reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add New Store"
      description="Create a new tournament venue for your platform"
      size="lg"
      onSubmit={formState.submit}
      onCancel={handleCancel}
      isSubmitting={formState.isSubmitting}
      isValid={formState.isValid}
      isDirty={formState.isDirty}
      submitLabel="Create Store"
      cancelLabel="Cancel"
      showCancel={true}
      useFormSubmission={false}
      error={createStore.error?.message || undefined}
    >
      <ModalForm>
        <div className="space-y-6">
          {/* Store Name */}
          <FormField
            label="Store Name"
            error={formState.errors.name}
            required
          >
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter store name"
                value={formState.data.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Address */}
          <FormField
            label="Address"
            error={formState.errors.address}
            required
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter street address"
                value={formState.data.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* City, State, ZIP Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="City"
              error={formState.errors.city}
              required
            >
              <Input
                type="text"
                placeholder="City"
                value={formState.data.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </FormField>

            <FormField
              label="State"
              error={formState.errors.state}
              required
            >
              <Input
                type="text"
                placeholder="State"
                value={formState.data.state || ''}
                onChange={(e) => updateField('state', e.target.value)}
              />
            </FormField>

            <FormField
              label="ZIP Code"
              error={formState.errors.zipCode}
              required
            >
              <Input
                type="text"
                placeholder="12345 or 12345-6789"
                value={formState.data.zipCode || ''}
                onChange={(e) => updateField('zipCode', e.target.value)}
              />
            </FormField>
          </div>

          {/* Contact Email */}
          <FormField
            label="Contact Email"
            error={formState.errors.contactEmail}
            description="Optional contact email for the store"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="contact@store.com"
                value={formState.data.contactEmail || ''}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Website */}
          <FormField
            label="Website"
            error={formState.errors.website}
            description="Optional website URL for the store"
          >
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://www.store.com"
                value={formState.data.website || ''}
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