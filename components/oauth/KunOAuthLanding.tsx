'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from '@bprogress/next'
import toast from 'react-hot-toast'
import { kunFetchGet } from '~/utils/kunFetch'
import { useUserStore } from '~/store/userStore'
import type { UserState } from '~/store/userStore'

// 鲲 OAuth 回调落地处理（仅挂在首页 `/`）。
//
// 背景：callback 是服务端 302，仅设了会话 cookie，前端持久化的 user store 仍为空；
// 而顶栏 User.tsx 的状态同步以 `uid > 0` 为前置（空 store 不会拉取），首登无法自动刷新。
// 故 callback 成功后改跳 `/?oauth=success`，此处补齐前端登录态：
//   拉 /api/user/status → setUser 写入持久化 store（对齐本地登录成功后的写法）→ 跳用户资源页。
//
// 另：本地/KUN 端封禁(`?error=banned`)刻意落首页而非 /login（指南 §7：封号再登无意义），
// 在此给终态提示。其余 error 落 /login，由 components/login/Login.tsx 消费。
export const KunOAuthLanding = () => {
  const router = useRouter()
  const { setUser } = useUserStore((state) => state)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) {
      return
    }
    const params = new URLSearchParams(window.location.search)

    if (params.get('oauth') === 'success') {
      handled.current = true
      void (async () => {
        const status =
          await kunFetchGet<KunResponse<UserState>>('/api/user/status')
        // 与顶栏同款判定：string 即会话失效/异常，object 即用户态。
        if (typeof status === 'string') {
          toast.error(status)
          router.replace('/', { scroll: false })
          return
        }
        setUser(status)
        toast.success('登录成功!')
        router.push(`/user/${status.uid}/resource`)
      })()
      return
    }

    if (params.get('error') === 'banned') {
      handled.current = true
      toast.error('您的账号已被封禁，无法登录', { duration: 6000 })
      router.replace('/', { scroll: false })
    }
  }, [router, setUser])

  return null
}
