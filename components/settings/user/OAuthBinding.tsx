'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from '@bprogress/next'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip
} from '@heroui/react'
import { Link } from '@heroui/link'
import toast from 'react-hot-toast'
import { kunFetchGet, kunFetchPost } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { useMounted } from '~/hooks/useMounted'
import { KunGalIcon } from '~/components/oauth/KunGalIcon'

// 鲲 OAuth 账号绑定设置（C6，计划 §五·1）。
// 展示绑定状态 + 绑定/解绑按钮；解绑前校验已设密码以防锁死（后端 unbind 兜底）。
interface OAuthBindingStatus {
  bound: boolean
  providerUserId: string | null
  hasUsablePassword: boolean
}

// 绑定回调结果参数（callback 以 /settings/user?oauth=<code> 回跳）→ 一次性中文提示。
const BIND_RESULT_MESSAGE: Record<
  string,
  { type: 'success' | 'error' | 'info'; message: string }
> = {
  bind_success: { type: 'success', message: '绑定鲲 Galgame 账号成功' },
  bind_already: { type: 'info', message: '该鲲 Galgame 账号已绑定到当前账号' },
  bind_exists: {
    type: 'info',
    message: '当前账号已绑定鲲 Galgame 账号，无需重复绑定'
  },
  bind_conflict: {
    type: 'error',
    message: '该鲲 Galgame 账号已被其他账号绑定，无法重复绑定'
  },
  bind_failed: { type: 'error', message: '绑定鲲 Galgame 账号失败，请重试' }
}

export const OAuthBinding = () => {
  const router = useRouter()
  const isMounted = useMounted()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<OAuthBindingStatus>({
    bound: false,
    providerUserId: null,
    hasUsablePassword: false
  })
  const handledParam = useRef(false)

  const fetchStatus = async () => {
    const res = await kunFetchGet<OAuthBindingStatus>(
      '/api/user/setting/oauth/status'
    )
    setStatus(res)
    setLoading(false)
  }

  useEffect(() => {
    if (isMounted) {
      fetchStatus()
    }
  }, [isMounted])

  // 消费 callback 回跳的绑定结果参数：一次性 toast 后清掉 URL（避免刷新/返回重复提示）。
  useEffect(() => {
    if (!isMounted || handledParam.current) {
      return
    }
    const result = new URLSearchParams(window.location.search).get('oauth')
    if (!result || !BIND_RESULT_MESSAGE[result]) {
      return
    }
    handledParam.current = true
    const { type, message } = BIND_RESULT_MESSAGE[result]
    if (type === 'success') {
      toast.success(message)
    } else if (type === 'error') {
      toast.error(message)
    } else {
      toast(message)
    }
    router.replace('/settings/user', { scroll: false })
  }, [isMounted, router])

  const handleBind = () => {
    // 整页跳转发起服务端绑定流程（?action=bind 要求已登录），不能用客户端 router。
    window.location.href = '/api/auth/oauth/kun/login?action=bind'
  }

  const handleUnbind = () => {
    startTransition(async () => {
      const res = await kunFetchPost<KunResponse<{}>>(
        '/api/user/setting/oauth/unbind'
      )
      kunErrorHandler(res, () => {
        toast.success('已解绑鲲 Galgame 账号')
        fetchStatus()
      })
    })
  }

  return (
    <Card className="w-full text-sm">
      <CardHeader>
        <h2 className="text-xl font-medium">鲲 Galgame 账号绑定</h2>
      </CardHeader>
      <CardBody className="py-0 space-y-4">
        <p>
          绑定鲲 Galgame 账号后，您可以使用鲲 Galgame
          账号一键登录本站，作为密码之外的另一种登录方式。
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>当前状态</span>
            {loading ? (
              <Chip size="sm" variant="flat">
                加载中…
              </Chip>
            ) : status.bound ? (
              <Chip size="sm" color="success" variant="flat">
                已绑定
              </Chip>
            ) : (
              <Chip size="sm" color="default" variant="flat">
                未绑定
              </Chip>
            )}
          </div>
          {!loading &&
            (status.bound ? (
              <Button
                color="danger"
                variant="flat"
                isLoading={isPending}
                isDisabled={isPending || !status.hasUsablePassword}
                onPress={handleUnbind}
              >
                解绑
              </Button>
            ) : (
              <Button
                color="primary"
                variant="flat"
                startContent={<KunGalIcon />}
                onPress={handleBind}
              >
                绑定鲲 Galgame 账号
              </Button>
            ))}
        </div>
        {status.bound && !status.hasUsablePassword && (
          <p className="text-warning">
            您还未设置登录密码，解绑后将无法登录。请先前往{' '}
            <Link size="sm" href="/auth/forgot">
              设置密码
            </Link>{' '}
            后再解绑。
          </p>
        )}
      </CardBody>
      <CardFooter className="flex-wrap">
        <p className="text-default-500">
          绑定的鲲 Galgame
          账号是您登录本站的另一种方式，解绑前请确保已设置登录密码，以免无法登录。
        </p>
      </CardFooter>
    </Card>
  )
}
