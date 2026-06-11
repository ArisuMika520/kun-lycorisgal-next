'use client'

import { useEffect, useRef, useTransition } from 'react'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Link, useDisclosure } from '@heroui/react'
import { kunFetchPost } from '~/utils/kunFetch'
import { loginSchema } from '~/validations/auth'
import { useUserStore } from '~/store/userStore'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { useRouter } from '@bprogress/next'
import toast from 'react-hot-toast'
import { KunCaptchaModal } from '~/components/kun/auth/CaptchaModal'
import { KunTextDivider } from '~/components/kun/TextDivider'
import { KunGalIcon } from '~/components/oauth/KunGalIcon'
import type { UserState } from '~/store/userStore'

type LoginFormData = z.infer<typeof loginSchema>

// 鲲 OAuth 回调失败时落 /login?error=<code> 的中文提示（约定见
// app/api/auth/oauth/kun/callback/route.ts 顶部）。banned 刻意落首页，由
// KunOAuthLanding 消费，不在此列。
const KUN_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: '登录状态校验失败，请重新使用鲲 Galgame 账号登录',
  oauth_failed: '鲲 Galgame 账号登录失败，请重试',
  expired: '授权已过期，请重新发起鲲 Galgame 账号登录',
  email_exists: '该邮箱已被本站账号注册，请先使用密码登录后绑定使用',
  // 设置页发起 ?action=bind 但会话已失效时落到这里（callback 之前的前置校验）。
  bind_login_required: '请先登录后再绑定鲲 Galgame 账号'
}

export const LoginForm = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isPending, startTransition] = useTransition()
  const { setUser } = useUserStore((state) => state)
  const router = useRouter()
  const handledOAuthError = useRef(false)

  // 鲲 OAuth 回调失败回跳 /login?error=<code> 时，给一次性中文 toast，
  // 随后清掉 URL 上的 error 参数（避免刷新/返回重复提示）。
  useEffect(() => {
    if (handledOAuthError.current) {
      return
    }
    const error = new URLSearchParams(window.location.search).get('error')
    if (!error) {
      return
    }
    handledOAuthError.current = true
    toast.error(
      KUN_OAUTH_ERROR_MESSAGES[error] ?? '鲲 Galgame 账号登录失败，请重试'
    )
    router.replace('/login', { scroll: false })
  }, [router])

  const { control, watch, reset } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      name: '',
      password: ''
    }
  })

  const handleCaptchaSuccess = async (code: string) => {
    startTransition(async () => {
      onClose()
      const res = await kunFetchPost<
        KunResponse<(UserState | KunUser) & { require2FA: boolean }>
      >('/api/auth/login', {
        ...watch(),
        captcha: code
      })

      kunErrorHandler(res, (value) => {
        if (value.require2FA) {
          router.push('/login/2fa')
        } else {
          const state = value as UserState
          setUser(state)
          reset()
          toast.success('登录成功!')
          router.push(`/user/${state.uid}/resource`)
        }
      })
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPending) {
      onOpen()
    }
  }

  return (
    <form
      className="flex flex-col w-full gap-5 pt-2"
      onSubmit={handleSubmit}
    >
      <Controller
        name="name"
        control={control}
        render={({ field, formState: { errors } }) => (
          <Input
            {...field}
            isRequired
            label="用户名或邮箱"
            type="text"
            variant="bordered"
            autoComplete="username"
            isInvalid={!!errors.name}
            errorMessage={errors.name?.message}
          />
        )}
      />

      <div className="flex flex-col w-full gap-1.5">
        <Controller
          name="password"
          control={control}
          render={({ field, formState: { errors } }) => (
            <Input
              {...field}
              isRequired
              label="密码"
              type="password"
              variant="bordered"
              isInvalid={!!errors.password}
              autoComplete="current-password"
              errorMessage={errors.password?.message}
            />
          )}
        />
        <div className="flex justify-end">
          <Link
            href="/auth/forgot"
            size="sm"
            className="text-default-500 transition-colors hover:text-primary"
          >
            忘记密码?
          </Link>
        </div>
      </div>

      <Button
        color="primary"
        className="w-full font-medium"
        type="submit"
        isDisabled={isPending}
        isLoading={isPending}
      >
        登录
      </Button>

      <KunCaptchaModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={handleCaptchaSuccess}
      />

      <KunTextDivider text="或" dividerClass="my-0" />

      <Button
        color="primary"
        variant="bordered"
        className="w-full"
        startContent={<KunGalIcon />}
        onPress={() => {
          // 跳后端发起路由（302 到鲲 OAuth），必须整页跳转而非客户端 router。
          window.location.href = '/api/auth/oauth/kun/login'
        }}
      >
        使用鲲 Galgame 账号登录
      </Button>

      <div className="flex items-center justify-center gap-1 text-sm">
        <span className="text-default-500">没有账号?</span>
        <Link href="register" size="sm">
          注册账号
        </Link>
      </div>
    </form>
  )
}
