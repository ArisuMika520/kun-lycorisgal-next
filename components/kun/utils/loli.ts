import { randomNum } from '~/utils/random'

const getAssetsFile = (name: string) => `/sooner/${name}.webp`

const number = randomNum(0, 3)

// 默认值，确保永远不会是空字符串
let loli = getAssetsFile('琥珀')
let name = '琥珀'

if (number === 0) {
  // Actually, her full name is: アーデルハイト・フォン・ベルクシュトラーセ
  name = 'あーちゃん'
  loli = getAssetsFile(name)
} else if (number === 1) {
  name = 'こじかひわ'
  loli = getAssetsFile(name)
} else if (number === 2) {
  name = '雪々'
  loli = getAssetsFile(name)
} else {
  name = '琥珀'
  loli = getAssetsFile(name)
}

export const loliAttribute = { loli, name }
