import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { Header } from "@/components/header";
import { AppProvider } from "@/components/app-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingProvider } from "@/components/loading-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Font configurations
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Play Rough Rankings",
  description: "Tournament leaderboard service for local card game tournaments",
  keywords: [
    "tournament",
    "leaderboard",
    "card games",
    "pokemon",
    "tcg",
    "rankings",
  ],
  authors: [{ name: "Play Rough Rankings" }],
  icons: {
    icon: "/play-rough-logo.svg",
    shortcut: "/play-rough-logo.svg",
    apple: "/play-rough-logo.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
        <ErrorBoundary>
          <AppProvider>
            <SessionProvider>
              <TRPCProvider>
                <LoadingProvider>
                  <div className="app-layout">
                    <Header />
                    <main className="main-content">{children}</main>
                    <footer className="main-footer">
                      <div className="container">
                        <p>
                          <small>
                            © 2024 Play Rough Rankings. All rights reserved.
                          </small>
                        </p>
                      </div>
                    </footer>
                  </div>
                </LoadingProvider>
              </TRPCProvider>
            </SessionProvider>
          </AppProvider>
        </ErrorBoundary>
        <SpeedInsights />
      </body>
    </html>
  );
}
