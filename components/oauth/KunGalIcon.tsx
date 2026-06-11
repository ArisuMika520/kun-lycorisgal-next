import Image from 'next/image'

// 鲲 Galgame 站点图标（public/kungal.webp，取自 https://www.kungal.com/favicon.webp）。
// 用于登录 / 注册 / 绑定按钮的 startContent，统一尺寸与圆角，避免三处样式漂移。
export const KunGalIcon = () => {
  return (
    <Image
      src="/kungal.webp"
      alt="鲲 Galgame"
      width={20}
      height={20}
      className="rounded-full shrink-0"
    />
  )
}
