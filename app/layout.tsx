import type { Metadata } from 'next'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc/provider'
import { SessionProvider } from '@/components/auth/session-provider'
import { SessionManager } from '@/components/auth/session-manager'
import { Navigation } from '@/components/navigation'
import { ThemeProvider } from '@/components/theme-provider'
import { ViewTransitionsProvider } from '@/components/view-transitions-provider'
import { ActivityProvider } from '@/components/activity-provider'

export const metadata: Metadata = {
  title: 'Play Rough Rankings',
  description: 'Tournament leaderboard service for local card game tournaments',
  keywords: ['tournament', 'leaderboard', 'card games', 'pokemon', 'tcg', 'rankings'],
  authors: [{ name: 'Play Rough Rankings' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ActivityProvider>
            <ViewTransitionsProvider>
              <SessionProvider>
                <TRPCProvider>
                  <SessionManager />
                  <div className="app-layout">
                    <Navigation />
                    <main className="main-content">
                      {children}
                    </main>
                    <footer className="main-footer">
                      <div className="container">
                        <p>
                          <small>
                            © 2024 Play Rough Rankings. Built with Next.js, tRPC, Prisma, and Pico CSS.
                          </small>
                        </p>
                      </div>
                    </footer>
                  </div>
                </TRPCProvider>
              </SessionProvider>
            </ViewTransitionsProvider>
          </ActivityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}