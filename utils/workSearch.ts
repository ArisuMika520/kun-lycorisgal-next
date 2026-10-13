const MAX_TITLE_LENGTH = 200
const GENERIC_LATIN_WORDS = new Set([
  'after',
  'story',
  'love',
  'plus',
  'edition'
])

// Titles and their aliases are the only inputs. NFKC also folds full-width Latin
// letters; punctuation and spacing should not turn the same title into a miss.
export const normalizeWorkTitle = (title: string) =>
  title
    .slice(0, MAX_TITLE_LENGTH)
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[\p{P}\p{Z}\p{S}\s]/gu, '')

const editDistance = (left: string[], right: string[], budget: number) => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  let beforePrevious = previous

  for (let i = 1; i <= left.length; i++) {
    const current = [i]
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + Number(left[i - 1] !== right[j - 1])
      )
      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      ) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1)
      }
    }
    if (Math.min(...current) > budget) {
      return budget + 1
    }
    beforePrevious = previous
    previous = current
  }

  return previous[right.length]
}

// Inputs are already normalized so the cached title index can be reused for all
// detected works. Short names need stricter matching to avoid unrelated games.
export const workTitleSimilarity = (query: string, title: string): number => {
  if (!query || !title) return 0
  if (query === title) return 1

  const shorter = Math.min([...query].length, [...title].length)
  const longer = Math.max([...query].length, [...title].length)
  if (shorter >= 2 && (title.includes(query) || query.includes(title))) {
    return 0.88 + (shorter / longer) * 0.1
  }
  if (shorter < 3) return 0

  // Use the longer title so a longer spelling (e.g. 雪おんな vs 雪女)
  // does not consume an allowance based on the shorter translation. Keep at
  // least two-thirds of the title alike, with a cap for very long names.
  const budget = Math.min(6, Math.floor(longer / 3))
  if (longer - shorter > budget) return 0
  const distance = editDistance([...query], [...title], budget)
  return distance <= budget ? 0.6 + (1 - distance / longer) * 0.24 : 0
}

export const prepareWorkTitle = (title: string) => {
  const text = title
    .slice(0, MAX_TITLE_LENGTH)
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
  return {
    normalized: normalizeWorkTitle(text),
    // Keep word boundaries before punctuation/spacing are removed. SPIN must
    // match SPIN! LOVE+PLUS, but must not match the unrelated word SPINE.
    han: text.match(/\p{Script=Han}{2,}/gu) ?? [],
    latin: (text.match(/[a-z]+/g) ?? []).filter(
      (word) => word.length >= 4 && !GENERIC_LATIN_WORDS.has(word)
    ),
    numbers: (text.match(/\d+/g) ?? []).join(','),
    hasKana: /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)
  }
}

type WorkTitle = ReturnType<typeof prepareWorkTitle>

const relatedTitleSimilarity = (query: WorkTitle, title: WorkTitle) => {
  // Cross-language fallback needs two independent anchors: a shared Han title
  // fragment (at least two characters) AND a distinctive whole Latin word.
  // It is a possible related edition, not an exact translation/identity match.
  if (query.hasKana === title.hasKana || query.numbers !== title.numbers) {
    return 0
  }
  const sharedHan = query.han.some((left) =>
    title.han.some((right) => left.startsWith(right) || right.startsWith(left))
  )
  const sharedLatin = query.latin.some((word) => title.latin.includes(word))
  return sharedHan && sharedLatin ? 0.55 : 0
}

export interface WorkTitleEntry {
  id: number
  titles: WorkTitle[]
  view: number
}

export const rankWorkTitles = (work: string, entries: WorkTitleEntry[]) => {
  const query = prepareWorkTitle(work)
  if (!query.normalized) return []

  return entries
    .map((entry) => ({
      id: entry.id,
      view: entry.view,
      score: Math.max(
        0,
        ...entry.titles.map(
          (title) =>
            workTitleSimilarity(query.normalized, title.normalized) ||
            relatedTitleSimilarity(query, title)
        )
      )
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.view - a.view || a.id - b.id)
}
