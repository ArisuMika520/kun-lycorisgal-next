import { prisma } from '~/prisma/index'
import { GalgameCardSelectField } from '~/constants/api/select'
import {
  normalizeWorkTitle,
  prepareWorkTitle,
  rankWorkTitles,
  type WorkTitleEntry
} from '~/utils/workSearch'

const MAX_WORKS = 12
const MAX_PER_WORK = 8
const INDEX_TTL_MS = 60_000

type TitleEntry = WorkTitleEntry & { contentLimit: string }
let titleIndex: { entries: TitleEntry[]; expires: number } | undefined
let pendingIndex: Promise<TitleEntry[]> | undefined

const getTitleIndex = async () => {
  if (titleIndex && titleIndex.expires > Date.now()) return titleIndex.entries
  if (pendingIndex) return pendingIndex

  // Read only title metadata, once per minute per server process. Ranking before
  // fetching cards prevents popular partial matches from crowding out exact ones.
  pendingIndex = prisma.patch
    .findMany({
      select: {
        id: true,
        name: true,
        alias: { select: { name: true } },
        view: true,
        content_limit: true
      }
    })
    .then((rows) => {
      const entries = rows.map((row) => ({
        id: row.id,
        titles: [
          ...new Set([row.name, ...row.alias.map((alias) => alias.name)])
        ].map(prepareWorkTitle),
        view: row.view,
        contentLimit: row.content_limit
      }))
      titleIndex = { entries, expires: Date.now() + INDEX_TTL_MS }
      return entries
    })
    .finally(() => {
      pendingIndex = undefined
    })
  return pendingIndex
}

type NamedCharacter = {
  candidates: { work: string }[]
}

const toCard = (gal: {
  id: number
  unique_id: string
  name: string
  banner: string
  view: number
  download: number
  type: string[]
  language: string[]
  platform: string[]
  created: Date
  tag: { tag: { name: string } }[]
  _count: GalgameCard['_count']
}): GalgameCard => ({
  id: gal.id,
  uniqueId: gal.unique_id,
  name: gal.name,
  banner: gal.banner,
  view: gal.view,
  download: gal.download,
  type: gal.type,
  language: gal.language,
  platform: gal.platform,
  tags: gal.tag.map((item) => item.tag.name).slice(0, 3),
  created: gal.created,
  _count: gal._count
})

export const matchIdentifyWorks = async (
  characters: NamedCharacter[],
  nsfwEnable: Record<string, string | undefined>
): Promise<IdentifyWorkMatch[]> => {
  const names = [
    ...new Set(
      characters.flatMap((character) =>
        character.candidates.map((candidate) => candidate.work.trim())
      )
    )
  ]
    .filter((work) => normalizeWorkTitle(work).length > 0)
    .slice(0, MAX_WORKS)

  if (!names.length) return []
  const entries = (await getTitleIndex()).filter(
    (entry) =>
      !nsfwEnable.content_limit ||
      entry.contentLimit === nsfwEnable.content_limit
  )
  const matches = names.map((work) => ({
    work,
    ids: rankWorkTitles(work, entries)
      .slice(0, MAX_PER_WORK)
      .map((entry) => entry.id)
  }))
  const ids = [...new Set(matches.flatMap((match) => match.ids))]
  if (!ids.length) return matches.map(({ work }) => ({ work, galgames: [] }))

  const rows = await prisma.patch.findMany({
    where: { ...nsfwEnable, id: { in: ids } },
    select: GalgameCardSelectField
  })
  const cards = new Map(rows.map((row) => [row.id, toCard(row)]))
  return matches.map(({ work, ids }) => ({
    work,
    galgames: ids.flatMap((id) => {
      const card = cards.get(id)
      return card ? [card] : []
    })
  }))
}
