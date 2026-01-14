import { generateNullMetadata } from '~/utils/noIndex'
import type { Metadata } from 'next'

export const generateKunMetadataTemplate = (): Metadata => {
    const title = `会社详情`
    return generateNullMetadata(title)
}
