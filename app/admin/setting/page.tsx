import { AdminSetting } from '~/components/admin/setting/Container'
import { kunMetadata } from './metadata'
import {
  kunGetDisableRegisterStatusActions,
  kunGetRedirectConfigActions
} from './actions'
import { ErrorComponent } from '~/components/error/ErrorComponent'
import type { Metadata } from 'next'

export const revalidate = 3

export const metadata: Metadata = kunMetadata

export default async function Kun() {
  const setting = await kunGetRedirectConfigActions()
  const response = await kunGetDisableRegisterStatusActions()

  if (typeof response === 'string' || typeof setting === 'string') {
    const errorText =
      typeof response === 'string'
        ? response
        : typeof setting === 'string'
          ? setting
          : ''
    return <ErrorComponent error={errorText} />
  }

  return (
    <AdminSetting
      setting={setting}
      disableRegister={response.disableRegister}
    />
  )
}
