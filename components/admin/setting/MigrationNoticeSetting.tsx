'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Switch,
  Textarea,
  useDisclosure
} from '@heroui/react'
import { Eye, Megaphone } from 'lucide-react'
import { kunFetchPut } from '~/utils/kunFetch'
import toast from 'react-hot-toast'
import { MigrationNoticeDialog } from '~/components/notice/MigrationNoticeModal'
import type { MigrationNoticeConfig } from '~/types/api/admin'

interface Props {
  notice: MigrationNoticeConfig
}

export const MigrationNoticeSetting = ({ notice }: Props) => {
  const [enabled, setEnabled] = useState(notice.enabled)
  const [title, setTitle] = useState(notice.title)
  const [content, setContent] = useState(notice.content)
  const [version, setVersion] = useState(notice.version)
  const [isSaving, setIsSaving] = useState(false)

  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleSave = async () => {
    if (enabled && (!title.trim() || !content.trim())) {
      toast.error('启用公告时, 标题和内容均不能为空')
      return
    }

    setIsSaving(true)
    const res = await kunFetchPut<KunResponse<MigrationNoticeConfig>>(
      '/api/admin/setting/migration-notice',
      { enabled, title, content }
    )
    if (typeof res === 'string') {
      toast.error(res)
    } else {
      setEnabled(res.enabled)
      setTitle(res.title)
      setContent(res.content)
      setVersion(res.version)
      toast.success('应用设置成功')
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">迁移公告弹窗</h2>
        <p className="text-small text-default-500">
          面向所有访客(含未登录用户)居中弹出的全站公告,
          用户可选择「确定」或「不再通知」
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">启用公告弹窗</h3>
              <p className="text-small text-default-500">
                开启后, 所有访客进入网站会看到该公告弹窗
              </p>
            </div>
            <Switch
              isSelected={enabled}
              onValueChange={setEnabled}
              size="lg"
              color="primary"
              startContent={<Megaphone className="size-4" />}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-lg font-semibold">
            <p>公告标题</p>
            <p className="text-sm font-medium text-default-500">
              显示在弹窗顶部, 最多 100 个字符
            </p>
          </h3>
          <Input
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如: 服务器迁移维护通知"
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-lg font-semibold">
            <p>公告内容</p>
            <p className="text-sm font-medium text-default-500">
              支持换行分段(回车), 最多 2000 个字符。内容以纯文本展示, 不解析
              HTML
            </p>
          </h3>
          <Textarea
            value={content}
            maxLength={2000}
            minRows={4}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              '例如:\n本站将于 7 月 12 日进行服务器迁移, 期间可能短暂无法访问。\n数据均已备份, 不会丢失, 给您带来的不便敬请谅解!'
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-row flex-wrap items-center gap-3">
          <Chip variant="flat" color="secondary" size="sm">
            当前版本 v{version}
          </Chip>
          <p className="text-small text-default-500">
            修改标题或内容并保存后版本号会自增, 已「确定 /
            不再通知」过的用户将重新看到更新后的公告
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="flat"
          color="secondary"
          startContent={<Eye className="size-4" />}
          onPress={onOpen}
          isDisabled={!title.trim() && !content.trim()}
        >
          预览效果
        </Button>
        <Button
          variant="shadow"
          color="primary"
          onPress={handleSave}
          isLoading={isSaving}
          isDisabled={isSaving}
        >
          应用设置
        </Button>
      </div>

      <MigrationNoticeDialog
        isOpen={isOpen}
        onClose={onClose}
        title={title || '公告标题'}
        content={content || '公告内容预览'}
        onConfirm={onClose}
        onNeverNotify={onClose}
      />
    </div>
  )
}
