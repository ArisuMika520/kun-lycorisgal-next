
export interface KunAdBanner {
  id: string
  title: string
  description: string
  image: string
  link: string
}

// 首页广告位 —— Hero 下方
export const kunHomeAds: KunAdBanner[] = [
  {
    id: 'ad1', // 风月AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200GIF1.gif',
    link: 'https://fengyueai.fun?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f'
  },
  {
    id: 'ad2', // 千速喵VPN
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E5%8D%83%E9%80%9F%E5%96%B5/qsm.jpg',
    link: 'https://www.tspeedcat.top/#/register?code=qlhiTSkn'
  }
]

// 【新增】游戏下载页 —— 顶部广告位 (Hero 与标签页之间), 一行两列
// 注意: 以下为占位素材, 售出后请替换为新合作方的 1200x200 创意与专属链接
export const kunGameDetailTopAds: KunAdBanner[] = [
  {
    id: 'game-detail-top-ad1', //风月AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200GIF1.gif',
    link: 'https://fengyueai.fun?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f'
  },
  {
    id: 'game-detail-top-ad2', // Null
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/1200x200.png',
    link: '#'
  }
]

// 游戏下载页 —— 资源区底部广告位
export const kunGameDetailAds: KunAdBanner[] = [
  {
    id: 'game-detail-ad1', // 夜语AI
    title: '',
    description: '',
    image:
      'https://r2.sakinori.top/yyai/1200x200.gif',
    link: 'https://www.yyai.mom/r/zctn'
  },
  {
    id: 'redirect-ad3', // 千速喵VPN
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E5%8D%83%E9%80%9F%E5%96%B5/qsm.jpg',
    link: 'https://www.tspeedcat.top/#/register?code=qlhiTSkn'
  },
  {
    id: 'redirect-ad4', // 木瓜玩
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/mumu.jpg',
    link: 'https://t.fgtrea.com/?pid=98'
  },
  {
    id: 'game-detail-ad2', // SoulAI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/soul.gif',
    link: 'https://sch.isco5.com?platId=7&channel=7018'
  }
]

// 外链跳转页广告位
export const kunRedirectAds: KunAdBanner[] = [
  {
    id: 'redirect-ad1', // 风月AI
    title: '',
    description: '',
    image:
      'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200GIF-ezgif.com-resize.gif',
    link: 'https://fengyueai.fun?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f'
  },
  {
    id: 'redirect-ad3', // 千速喵VPN
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E5%8D%83%E9%80%9F%E5%96%B5/qsm.jpg',
    link: 'https://www.tspeedcat.top/#/register?code=qlhiTSkn'
  },
  {
    id: 'redirect-ad2', // 木瓜玩
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/mumu.jpg',
    link: 'https://t.fgtrea.com/?pid=98'
  },
  {
    id: 'redirect-ad5', // 夜语AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/yyai/1200x200.gif',
    link: 'https://www.yyai.mom/r/zctn'
  },
  {
    id: 'redirect-ad4', // SoulAI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/soul.gif',
    link: 'https://sch.isco5.com?platId=7&channel=7018'
  }
]
