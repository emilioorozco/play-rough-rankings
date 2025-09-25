'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { trpc } from '@/lib/trpc/client'
import { StoreCreateModal } from '@/components/admin/store-create-modal'
import { useModal } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'

export default function AdminStoresPage() {
  const storeCreateModal = useModal('storeCreate')
  
  // Get stores data
  const { data: storesData, isLoading } = trpc.stores.list.useQuery({})

  const handleCreateSuccess = () => {
    // You could add a toast notification here
    console.log('Store created successfully!')
    storeCreateModal.close()
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container">
        <div className="hero-section">
          <h1>Store Management</h1>
          <p>Manage tournament venues and store partnerships</p>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Store Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {isLoading ? '-' : storesData?.stores?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Stores</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Active Venues</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">This Month&apos;s Tournaments</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Partner Stores</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Store Management Tools</h2>
            <p className="text-muted-foreground mb-6">
              Manage store partnerships, venue information, and tournament hosting capabilities.
            </p>
                 <div className="flex flex-wrap gap-3">
                   <Button onClick={() => storeCreateModal.open()}>
                     Add New Store
                   </Button>
              <Button variant="secondary" disabled>
                View All Stores (Coming Soon)
              </Button>
              <Button variant="secondary" disabled>
                Manage Partnerships (Coming Soon)
              </Button>
              <Button variant="secondary" disabled>
                Venue Analytics (Coming Soon)
              </Button>
                 </div>
          </div>

          {storesData?.stores && storesData.stores.length > 0 && (
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Current Stores</h2>
              <div className="space-y-4">
                {storesData.stores.map((store) => (
                  <div key={store.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.address}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" disabled>
                          Edit
                        </Button>
                        <Button variant="secondary" disabled>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

             {/* Store Creation Modal */}
             <StoreCreateModal
               isOpen={storeCreateModal.isOpen}
               onClose={() => storeCreateModal.close()}
               onSuccess={handleCreateSuccess}
             />
      </div>
    </ProtectedRoute>
  )
}
