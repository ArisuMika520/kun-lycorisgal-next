import { TopicManagement } from '~/components/admin/TopicManagement'
import { kunMetadata } from '../metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  ...kunMetadata,
  title: '话题管理 - 管理面板'
}

export default function TopicManagementPage() {
  return <TopicManagement />
}