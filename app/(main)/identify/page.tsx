import { IdentifyPage } from '~/components/identify/IdentifyPage'
import { kunMetadata } from './metadata'
import { Suspense } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = kunMetadata

export default function Identify() {
  return (
    <Suspense>
      <IdentifyPage />
    </Suspense>
  )
}
