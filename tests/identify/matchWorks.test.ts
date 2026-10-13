import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prisma } from '../../prisma/index'
import { matchIdentifyWorks } from '../../app/api/identify/matchWorks'

test('matches only works, shares the title cache, and filters content before and after ranking', async (context) => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: index < 10 ? '千恋万花' : index === 10 ? '千恋万华' : '朝武芳乃',
    alias: [],
    view: 100 - index,
    content_limit: index < 10 ? 'nsfw' : 'sfw',
    unique_id: `work${index}`,
    banner: '',
    download: 0,
    type: [],
    language: [],
    platform: [],
    created: new Date(),
    tag: [],
    _count: { favorite_folder: 0, resource: 0, comment: 0 }
  }))
  let indexReads = 0
  const cardFilters: string[] = []
  const original = prisma.patch.findMany
  context.after(() => {
    prisma.patch.findMany = original
  })
  prisma.patch.findMany = (async (args: {
    where?: { content_limit?: string; id: { in: number[] } }
  }) => {
    if (!args.where) {
      indexReads++
      return rows
    }
    const { content_limit, id } = args.where
    cardFilters.push(content_limit ?? 'all')
    return rows.filter(
      (row) =>
        id.in.includes(row.id) &&
        (!content_limit || row.content_limit === content_limit)
    )
  }) as unknown as typeof original
  const characters = [
    {
      candidates: [
        { work: ' 千恋万花 ', character: '朝武芳乃' },
        { work: '千恋万花', character: '常陆茉子' }
      ]
    }
  ]
  const [safe, all] = await Promise.all([
    matchIdentifyWorks(characters, { content_limit: 'sfw' }),
    matchIdentifyWorks(characters, {})
  ])
  assert.equal(indexReads, 1)
  assert.equal(safe.length, 1)
  assert.equal(safe[0].work, '千恋万花')
  assert.deepEqual(
    safe[0].galgames.map((game) => game.id),
    [11]
  )
  assert.equal(all[0].galgames.length, 8)
  assert.ok(all[0].galgames.every((game) => game.id <= 10))
  assert.deepEqual(cardFilters.sort(), ['all', 'sfw'])

  assert.deepEqual(
    await matchIdentifyWorks([{ candidates: [{ work: '' }] }], {}),
    []
  )
  assert.equal(indexReads, 1)

  // A rating changed after the index was cached: the live card query still wins.
  rows[10].content_limit = 'nsfw'
  const changed = await matchIdentifyWorks(characters, { content_limit: 'sfw' })
  assert.deepEqual(changed[0].galgames, [])
})
