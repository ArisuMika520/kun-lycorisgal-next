'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from '@bprogress/next'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import {
  Ban,
  Eye,
  EyeOff,
  RotateCcw,
  Shield,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import { USER_STATUS_COLOR_MAP, USER_STATUS_MAP } from '~/constants/user'
import {
  getKunFetchErrorMessage,
  kunFetchDelete,
  kunFetchPut
} from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { ConfirmActionButton } from './ConfirmActionButton'
import type { UserInfo } from '~/types/api/user'

interface Props {
  user: UserInfo
  // 访问者角色，来自服务端 JWT，仅用于决定显示；真正的权限由接口从数据库重新校验
  viewerRole: number
}

const consequenceList = (items: string[]) => (
  <ul className="pl-5 space-y-1 list-disc text-small text-default-600">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

/**
 * 用户主页上的管理员快捷操作卡片，免去去后台搜索用户的步骤。
 * 所有操作都经 `ConfirmActionButton` 二次确认；显示条件与后端 `guardManageUser` 一致：
 * - 封禁 / shadow ban：访问者角色 >= 3 且严格高于目标用户；
 * - 删除（伪删除）/ 恢复：访问者为超级管理员且严格高于目标用户。
 * 调用方负责在“访问者不是管理员”或“查看的是自己”时不渲染本组件。
 */
export const UserAdminPanel = ({ user, viewerRole }: Props) => {
  const router = useRouter()
  const [status, setStatus] = useState(user.status)
  const [isShadowBanned, setIsShadowBanned] = useState(user.isShadowBanned)
  const [isDeleted, setIsDeleted] = useState(user.isDeleted)

  const canManage = viewerRole >= 3 && viewerRole > user.role
  const canDelete = viewerRole >= 4 && viewerRole > user.role
  const isBanned = status === 2

  // 新式接口（真实 HTTP 状态码 + { error }）统一处理：成功提示并刷新服务端数据
  const putAction = async (
    url: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    try {
      await kunFetchPut(url, body)
      toast.success(successMessage)
      router.refresh()
      return true
    } catch (error) {
      toast.error(getKunFetchErrorMessage(error) ?? '操作失败，请稍后重试')
      return false
    }
  }

  const handleToggleBan = async () => {
    const ok = await putAction(
      '/api/admin/user/status',
      { uid: user.id, status: isBanned ? 0 : 2 },
      isBanned ? `已解除 ${user.name} 的封禁` : `已封禁 ${user.name}`
    )
    if (ok) {
      setStatus(isBanned ? 0 : 2)
    }
    return ok
  }

  const handleToggleShadowBan = async () => {
    const ok = await putAction(
      '/api/admin/user/shadow-ban',
      { uid: user.id, enabled: !isShadowBanned },
      isShadowBanned
        ? `已解除 ${user.name} 的 shadow ban`
        : `已 shadow ban ${user.name}`
    )
    if (ok) {
      setIsShadowBanned(!isShadowBanned)
    }
    return ok
  }

  const handleRestore = async () => {
    const ok = await putAction(
      '/api/admin/user/restore',
      { uid: user.id },
      `已恢复用户 ${user.name}`
    )
    if (ok) {
      setIsDeleted(false)
    }
    return ok
  }

  // 删除接口沿用旧式错误返回（HTTP 200 + 错误字符串）
  const handleDelete = async () => {
    try {
      const res = await kunFetchDelete<KunResponse<{}>>('/api/admin/user', {
        uid: user.id
      })
      let ok = false
      kunErrorHandler(res, () => {
        ok = true
        toast.success(`已删除用户 ${user.name}，可随时恢复`)
        setIsDeleted(true)
        router.refresh()
      })
      return ok
    } catch (error) {
      toast.error(getKunFetchErrorMessage(error) ?? '删除失败，请稍后重试')
      return false
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex-wrap justify-between gap-2 px-6 pt-4 pb-0">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <span className="font-semibold">管理员操作</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {isDeleted && (
            <Chip color="danger" variant="solid" size="sm">
              已删除
            </Chip>
          )}
          {isShadowBanned && (
            <Chip color="warning" variant="flat" size="sm">
              Shadow Ban
            </Chip>
          )}
          <Chip color={USER_STATUS_COLOR_MAP[status]} variant="flat" size="sm">
            {USER_STATUS_MAP[status]}
          </Chip>
        </div>
      </CardHeader>

      <CardBody className="gap-3 px-6 py-4">
        {(isDeleted || isShadowBanned) && (
          <p className="text-small text-warning-600">
            {isDeleted
              ? '该账号已删除，无法登录，其发布的内容对所有人隐藏。'
              : '该用户发布的内容只有本人和管理员可见，本人不会察觉。'}
            你作为管理员仍可在本页各标签中查看。
          </p>
        )}

        {isDeleted ? (
          <ConfirmActionButton
            label="恢复用户"
            icon={<RotateCcw className="size-4" />}
            color="success"
            isDisabled={!canDelete}
            title="恢复用户"
            description={
              <>
                <p>
                  确定要恢复 <span className="font-bold">{user.name}</span> 吗？
                </p>
                {consequenceList([
                  '账号可以重新登录，内容恢复对外显示',
                  '解除其邮箱和注册 IP 的注册限制',
                  '删除前的封禁、shadow ban 状态保持不变'
                ])}
              </>
            }
            confirmLabel="确认恢复"
            onConfirm={handleRestore}
          />
        ) : (
          <>
            <ConfirmActionButton
              label={isBanned ? '解除封禁' : '封禁用户'}
              icon={
                isBanned ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <Ban className="size-4" />
                )
              }
              color={isBanned ? 'success' : 'danger'}
              isDisabled={!canManage}
              title={isBanned ? '解除封禁' : '封禁用户'}
              description={
                isBanned ? (
                  <p>
                    确定要解除 <span className="font-bold">{user.name}</span>{' '}
                    的封禁吗？解除后该用户可以重新登录。
                  </p>
                ) : (
                  <>
                    <p>
                      确定要封禁 <span className="font-bold">{user.name}</span>{' '}
                      吗？
                    </p>
                    {consequenceList([
                      '该用户会被立即登出，且无法再次登录',
                      '已发布的资源和评论保留不变，仍对外显示',
                      '之后可以在这里随时解除封禁'
                    ])}
                  </>
                )
              }
              confirmLabel={isBanned ? '确认解除封禁' : '确认封禁'}
              onConfirm={handleToggleBan}
            />

            <ConfirmActionButton
              label={isShadowBanned ? '解除 Shadow Ban' : 'Shadow Ban'}
              icon={
                isShadowBanned ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )
              }
              color={isShadowBanned ? 'success' : 'warning'}
              isDisabled={!canManage}
              title={isShadowBanned ? '解除 Shadow Ban' : 'Shadow Ban'}
              description={
                isShadowBanned ? (
                  <p>
                    确定要解除 <span className="font-bold">{user.name}</span> 的
                    shadow ban 吗？其发布的全部内容会立即恢复对外显示。
                  </p>
                ) : (
                  <>
                    <p>
                      确定要 shadow ban{' '}
                      <span className="font-bold">{user.name}</span> 吗？
                    </p>
                    {consequenceList([
                      '该用户可以照常登录和发布，看到的页面与平时一样',
                      '其资源、评论、话题和发出的站内消息对其他所有人隐藏',
                      '管理员只能在本页查看其内容',
                      '适合处理反复注册新号发布违规内容的用户'
                    ])}
                  </>
                )
              }
              confirmLabel={
                isShadowBanned ? '确认解除 Shadow Ban' : '确认 Shadow Ban'
              }
              onConfirm={handleToggleShadowBan}
            />

            {canDelete && (
              <ConfirmActionButton
                label="删除用户"
                icon={<Trash2 className="size-4" />}
                color="danger"
                variant="light"
                title="删除用户"
                description={
                  <>
                    <p>
                      即将删除 <span className="font-bold">{user.name}</span>
                      （ID: {user.id}）：
                    </p>
                    {consequenceList([
                      '账号立即登出且无法再登录',
                      `其 ${user._count.patch_resource} 个资源、${user._count.patch_comment} 条评论以及话题、站内消息对所有人隐藏，数据保留`,
                      '其邮箱和注册 IP 将被永久禁止注册',
                      '之后可以在这里恢复'
                    ])}
                  </>
                }
                confirmLabel="确认删除"
                requireTyping={user.name}
                onConfirm={handleDelete}
              />
            )}
          </>
        )}

        {!canManage && (
          <p className="text-tiny text-default-500">
            该用户与您同级或权限更高，无法在此管理
          </p>
        )}
      </CardBody>
    </Card>
  )
}
