'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TournamentOverview } from './tournament-overview'
import { TournamentBrackets } from './tournament-brackets'
import { TournamentParticipants } from './tournament-participants'
import { TournamentResults } from './tournament-results'
import { TournamentDiscussion } from './tournament-discussion'
import type { ApiTournament } from '@/lib/types/api'
import { useTab } from '@/stores/ui-store'
import * as React from 'react'

interface TournamentTabsProps {
  tournament: ApiTournament
  isOrganizer: boolean
  isRegistered: boolean
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
  } | null
  userPreferences?: {
    nameDisplayPreference: 'FIRST_NAME' | 'FIRST_LAST_NAME' | 'DISPLAY_NAME' | 'OPT_OUT'
  } | null
  canManage?: boolean
  onUpdate?: () => void
}

export function TournamentTabs({
  tournament,
  isOrganizer,
  isRegistered,
  currentUser,
  userPreferences,
  canManage = false,
  onUpdate
}: TournamentTabsProps) {
  const { activeTab, setActiveTab } = useTab('tournamentDetails')
  const mobileScrollRef = React.useRef<HTMLDivElement | null>(null)
  const anchorRef = React.useRef<HTMLDivElement | null>(null)

  // Initialize with default tab if none is active
  if (!activeTab) {
    setActiveTab('overview')
  }

  React.useEffect(() => {
    const container = mobileScrollRef.current
    if (!container) return
    const el = container.querySelector<HTMLButtonElement>(`#tab-trigger-${activeTab}`)
    if (el) {
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const currentLeft = container.scrollLeft
      const offsetLeft = elRect.left - containerRect.left + currentLeft
      const targetLeft = Math.max(
        0,
        offsetLeft - (container.clientWidth - elRect.width) / 2
      )
      container.scrollTo({ left: targetLeft, behavior: 'smooth' })
    }
  }, [activeTab])

  // Smooth vertical scroll to keep tabs pinned under header when switching to shorter tab
  React.useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const headerOffset = 72 // Adjust if header height differs
    const anchorTop = anchor.getBoundingClientRect().top + window.scrollY
    const targetTop = Math.max(0, anchorTop - headerOffset)
    if (window.scrollY > targetTop) {
      window.scrollTo({ top: targetTop, behavior: 'smooth' })
    }
  }, [activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  return (
    <>
      <div ref={anchorRef} />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      {/* Mobile: horizontally scrollable tab list */}
      <div className="block lg:hidden -mx-4 px-4">
        <div ref={mobileScrollRef} className="flex gap-2 overflow-x-auto no-scrollbar">
          <TabsList className="inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground min-w-max">
            <TabsTrigger id="tab-trigger-overview" value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger id="tab-trigger-brackets" value="brackets" className="whitespace-nowrap">Brackets</TabsTrigger>
            <TabsTrigger id="tab-trigger-participants" value="participants" className="whitespace-nowrap">Participants</TabsTrigger>
            <TabsTrigger id="tab-trigger-results" value="results" className="whitespace-nowrap">Results</TabsTrigger>
            <TabsTrigger id="tab-trigger-discussion" value="discussion" className="whitespace-nowrap">Discussion</TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* Desktop: regular grid tabs */}
      <div className="hidden lg:block">
        <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <TournamentOverview 
          tournament={tournament}
          isOrganizer={isOrganizer}
          isRegistered={isRegistered}
          currentUser={currentUser}
          userPreferences={userPreferences}
        />
      </TabsContent>

      <TabsContent value="brackets" className="space-y-6">
        <TournamentBrackets 
          tournament={tournament}
          isOrganizer={isOrganizer}
          canManage={canManage}
          currentUser={currentUser}
        />
      </TabsContent>

      <TabsContent value="participants" className="space-y-6">
        <TournamentParticipants 
          tournament={tournament}
          isOrganizer={isOrganizer}
          currentUser={currentUser}
          canManage={canManage}
          onUpdate={onUpdate}
        />
      </TabsContent>

      <TabsContent value="results" className="space-y-6">
        <TournamentResults 
          tournament={tournament}
        />
      </TabsContent>

      <TabsContent value="discussion" className="space-y-6">
        <TournamentDiscussion 
          tournament={tournament}
        />
      </TabsContent>
    </Tabs>
    </>
  )
}
