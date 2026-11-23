export const USER_ROLE_MAP: Record<number, string> = {
  1: '用户',
  2: '创作者',
  3: '管理员',
  4: '超级管理员'
}

export const USER_STATUS_MAP: Record<number, string> = {
  0: '正常',
  1: '限制（正在开发中）',
  2: '封禁'
}

export const USER_STATUS_COLOR_MAP: Record<
  number,
  'success' | 'warning' | 'danger'
> = {
  0: 'success',
  1: 'warning',
  2: 'danger'
}

// 被伪删除的账号在登录、OAuth、找回密码时看到的提示
export const USER_DELETED_MESSAGE =
  '该账号已被删除，邮箱与注册 IP 已被永久禁止注册'

// 邮箱或 IP 命中禁止注册名单（被删除用户遗留）时的提示
export const REGISTER_BANNED_MESSAGE = '您的邮箱或 IP 地址已被永久禁止注册'
