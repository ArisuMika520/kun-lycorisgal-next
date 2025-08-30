import { Sidebar } from '~/components/admin/Sidebar'
import { AdminGuard } from '~/components/admin/AdminGuard'
// import { Navbar } from '~/components/admin/Navbar'
import { kunMetadata } from './metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = kunMetadata

interface Props {
  children: React.ReactNode
}

export default function Kun({ children }: Props) {
  return (
    <AdminGuard>
      <div className="container flex mx-auto my-4">
        <Sidebar />
        <div className="flex w-full overflow-y-auto">
          {/* <Navbar /> */}
          <div className="w-full p-4">{children}</div>
        </div>
      </div>
    </AdminGuard>
  )
}
