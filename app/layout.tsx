import '~/styles/index.css'
import { Providers } from '~/app/providers'
import { Toaster } from 'react-hot-toast'
import { KunNavigationBreadcrumb } from '~/components/kun/NavigationBreadcrumb'
import { cn } from '~/utils/cn'
import { KunTopBar } from '~/components/kun/top-bar/TopBar'
import { KunBackToTop } from '~/components/kun/BackToTop'
import { AppShell } from '~/components/layout/AppShell'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn('min-h-screen bg-background antialiased')}>
        <Providers>
          <div className="relative flex flex-col h-screen">
            <KunTopBar />
            <Toaster />
            <AppShell>{children}</AppShell>
            <KunBackToTop />
          </div>
        </Providers>
      </body>
    </html>
  )
}