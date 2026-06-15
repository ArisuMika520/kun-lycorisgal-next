import { Divider } from '@heroui/divider'
import { RedirectSetting } from './RedirectSetting'
import { DisableRegisterSetting } from './DisableRegisterSetting'
import { MigrationNoticeSetting } from './MigrationNoticeSetting'
import type {
  AdminRedirectConfig,
  MigrationNoticeConfig
} from '~/types/api/admin'

interface Props {
  setting: AdminRedirectConfig
  disableRegister: boolean
  migrationNotice: MigrationNoticeConfig
}

export const AdminSetting = ({
  setting,
  disableRegister,
  migrationNotice
}: Props) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">网站设置</h1>
      </div>

      <RedirectSetting setting={setting} />

      <Divider />

      <DisableRegisterSetting disableRegister={disableRegister} />

      <Divider />

      <MigrationNoticeSetting notice={migrationNotice} />
    </div>
  )
}
