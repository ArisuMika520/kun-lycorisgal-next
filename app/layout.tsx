import '~/styles/index.css'
import Script from 'next/script'
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
      <head>
        <script defer src="https://cloud.umami.is/script.js" data-website-id="e9ab7228-7489-4a5f-841d-bf643f09e517"></script>
        <script defer src="https://was.arisumika.top/script.js" data-website-id="de111887-9bfc-411a-9e0d-7e6550750d57"></script>
      </head>
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