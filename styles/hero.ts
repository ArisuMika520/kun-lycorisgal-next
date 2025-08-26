// 文件路径: styles/hero.ts

import { heroui } from '@heroui/react'

export default heroui({
  themes: {
    dark: { // 暗色模式主题
      colors: {
        primary: {
          DEFAULT: '#f791a9', // 您的主色调
          '50': '#fef2f4',
          '100': '#fde7eb',
          '200': '#fbd0d9',
          '300': '#f9a8b9',
          '400': '#f791a9', // 主色调
          '500': '#f472b6',
          '600': '#ec4899',
          '700': '#db2777',
          '800': '#be185d',
          '900': '#9d174d',
          foreground: '#1c0b11', // 在主色调按钮上的文字颜色（深色以保证可读性）
        },
        secondary: {
          DEFAULT: '#d8b4fe', // 辅色 (淡紫色)
          foreground: '#1c1125',
        },
        focus: '#f791a9', // 焦点颜色
      },
    },
    light: { // 亮色模式主题
      colors: {
        primary: {
          DEFAULT: '#f791a9', // 您的主色调
          '50': '#fef2f4',
          '100': '#fde7eb',
          '200': '#fbd0d9',
          '300': '#f9a8b9',
          '400': '#f791a9', // 主色调
          '500': '#f472b6',
          '600': '#ec4899',
          '700': '#db2777',
          '800': '#be185d',
          '900': '#9d174d',
          foreground: '#1c0b11', // 在主色调按钮上的文字颜色（深色以保证可读性）
        },
        secondary: {
          DEFAULT: '#c084fc', // 辅色
        },
        focus: '#f791a9',
      },
    },
  },
})
