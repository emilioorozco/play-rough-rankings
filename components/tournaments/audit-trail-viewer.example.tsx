/**
 * Example usage of AuditTrailViewer component
 * 
 * This file demonstrates how to integrate the audit trail viewer
 * into tournament management interfaces.
 */

import React from 'react'
import { AuditTrailViewer } from './audit-trail-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Example 1: Full audit trail in tournament management page
 */
export function TournamentManagementWithAudit({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tournament Management</h2>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {/* Tournament overview content */}
        </TabsContent>
        
        <TabsContent value="matches">
          {/* Matches content */}
        </TabsContent>
        
        <TabsContent value="audit">
          {/* Full audit trail with all features */}
          <AuditTrailViewer tournamentId={tournamentId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Example 2: Compact audit trail in match details
 */
export function MatchDetailsWithAudit({ 
  tournamentId, 
  matchId 
}: { 
  tournamentId: string
  matchId: string 
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Match Details</h3>
      
      {/* Match information */}
      <div className="p-4 border rounded-lg">
        {/* Match details content */}
      </div>
      
      {/* Compact match-specific audit trail */}
      <AuditTrailViewer 
        tournamentId={tournamentId}
        matchId={matchId}
        compact={true}
        initialLimit={10}
      />
    </div>
  )
}

/**
 * Example 3: Audit trail in organizer dashboard
 */
export function OrganizerDashboardWithAudit({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column: Tournament controls */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Tournament Controls</h3>
        {/* Tournament management controls */}
      </div>
      
      {/* Right column: Recent audit trail */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Recent Activity</h3>
        <AuditTrailViewer 
          tournamentId={tournamentId}
          compact={true}
          initialLimit={5}
        />
      </div>
    </div>
  )
}

/**
 * Example 4: Standalone audit trail page
 */
export function AuditTrailPage({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <AuditTrailViewer tournamentId={tournamentId} initialLimit={50} />
      </div>
    </div>
  )
}
