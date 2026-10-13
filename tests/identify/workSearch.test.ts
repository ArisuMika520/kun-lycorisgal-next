import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  normalizeWorkTitle,
  prepareWorkTitle,
  rankWorkTitles,
  workTitleSimilarity
} from '../../utils/workSearch'
import { webSearchHref } from '../../components/identify/shared'

const similarity = (a: string, b: string) =>
  workTitleSimilarity(normalizeWorkTitle(a), normalizeWorkTitle(b))

test('normalizes title typography without requiring identical punctuation', () => {
  assert.equal(similarity('ＳＴＥＩＮＳ；ＧＡＴＥ', 'Steins; Gate'), 1)
  assert.equal(
    similarity(
      'サクラノ詩 — 櫻の森の上を舞う —',
      'サクラノ詩 櫻の森の上を舞う'
    ),
    1
  )
})

test('matches substitutions, insertions, deletions and adjacent transpositions', () => {
  for (const [query, title] of [
    ['千恋万华', '千恋万花'],
    ['喫茶ステラと死神の蝶', '喫茶ステラと死神の蠂'],
    ['苍之彼方四重奏', '苍之彼方的四重奏'],
    ['苍之彼方的四重重奏', '苍之彼方的四重奏'],
    ['恋千万花', '千恋万花'],
    ['海之彼方的四重曲', '苍之彼方的四重奏'],
    ['樱之诗樱花森林上飞翔', '樱之诗樱花林间中飞翔']
  ]) {
    assert.ok(similarity(query, title) > 0, `${query} should match ${title}`)
  }
})

test('keeps short and unrelated titles strict; supports exact single-character names', () => {
  assert.equal(similarity('雪', '雪'), 1)
  for (const [a, b] of [
    ['', '千恋万花'],
    ['！？', '千恋万花'],
    ['雪', '雪色恋歌'],
    ['夏空', '夏雪'],
    ['千恋万花', '樱花裁决'],
    ['美少女万華鏡異聞 雪おんな', '美少女戦士セーラームーン'],
    ['美少女万華鏡異聞 雪おんな', '美少女战士'],
    ['summer', 'winter']
  ]) {
    assert.equal(similarity(a, b), 0, `${a} should not match ${b}`)
  }
})

test('matches the b2888aba title aliases despite mixed kanji and kana spelling', () => {
  const recognized = '美少女万華鏡異聞 雪おんな'
  const titles = [
    '美少女万华镜 异闻雪女',
    '美少女万華鏡６',
    '美少女萬華鏡 6',
    '美少女萬華鏡異聞 雪女',
    'Biman 6'
  ].map(prepareWorkTitle)
  const matches = rankWorkTitles(recognized, [{ id: 35, titles, view: 0 }])
  assert.deepEqual(
    matches.map((entry) => entry.id),
    [35]
  )
  assert.ok(matches[0].score > 0 && matches[0].score < 1)
  assert.equal(
    similarity(recognized, '美少女萬華鏡異聞 雪女'),
    similarity('美少女萬華鏡異聞 雪女', recognized)
  )
})

test('ranks exact aliases before popular partial and approximate matches', () => {
  const entries = [
    { id: 1, titles: ['千恋万花续作'], view: 999999 },
    { id: 2, titles: ['senrenbanka', '千恋万花'], view: 1 },
    { id: 3, titles: ['千恋万华'], view: 200 },
    { id: 4, titles: ['千恋万华'], view: 100 }
  ].map((entry) => ({ ...entry, titles: entry.titles.map(prepareWorkTitle) }))
  assert.deepEqual(
    rankWorkTitles('千恋万花', entries).map((entry) => entry.id),
    [2, 1, 3, 4]
  )
  assert.deepEqual(rankWorkTitles('!!!', entries), [])
})

test('finds b54b7e5a from shared Han and Latin title parts across translations', () => {
  const query = '猫忍えくすはーとSPIN!!'
  const entries = [
    { id: 34, titles: ['猫忍之心SPIN! LOVE+PLUS', 'Cats', '猫'], view: 9999 },
    { id: 1, titles: [query], view: 0 },
    { id: 2, titles: ['猫忍えくすはーとSPIN!!! LOVE+PLUS'], view: 0 }
  ].map((entry) => ({ ...entry, titles: entry.titles.map(prepareWorkTitle) }))
  const matches = rankWorkTitles(query, entries)
  assert.deepEqual(
    matches.map((entry) => entry.id),
    [1, 2, 34]
  )
  assert.ok(matches[2].score < matches[1].score)
})

test('related title fallback requires distinct whole-word and Han anchors with compatible numbers', () => {
  const entries = [
    '猫忍之心 LOVE+PLUS',
    '别的作品SPIN! LOVE+PLUS',
    '猫娘SPIN! LOVE+PLUS',
    '猫忍之心SPINE! LOVE+PLUS',
    '猫忍之心SPIN2! LOVE+PLUS',
    'Cats',
    '猫'
  ].map((title, id) => ({ id, titles: [prepareWorkTitle(title)], view: 0 }))
  assert.deepEqual(rankWorkTitles('猫忍えくすはーとSPIN!!', entries), [])
  assert.deepEqual(
    rankWorkTitles('猫忍えくすはーとLOVE!!', [
      {
        id: 34,
        titles: [prepareWorkTitle('猫忍之心SPIN! LOVE+PLUS')],
        view: 0
      }
    ]),
    []
  )
})

test('Bing receives only the work title and safely encodes special characters', () => {
  const url = new URL(webSearchHref('  星空 & 梦想 / After?  '))
  assert.equal(url.origin, 'https://www.bing.com')
  assert.equal(url.searchParams.get('q'), '星空 & 梦想 / After?')
  assert.equal([...url.searchParams].length, 1)
})
