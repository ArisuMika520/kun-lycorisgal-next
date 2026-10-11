export const VNDB_WORK_ID_EXAMPLE = 'v19658'

const INVALID = `请提供有效的 VNDB 作品 ID，例如 ${VNDB_WORK_ID_EXAMPLE}`
const RELEASE_ID =
  '请填写作品 ID（v 开头）。发行版 ID（r 开头）不能用于发布或查重'

export type VndbWorkIdResult =
  | { ok: true; id: string }
  | { ok: false; message: string }

export function parseVndbWorkId(raw: string): VndbWorkIdResult {
  const match = raw
    .trim()
    .match(
      /^(?:vndb:|https?:\/\/(?:www\.)?vndb\.org\/)?([vr]\d+)(?:\.\d+)?(?:[/?#].*)?$/i
    )
  if (!match) return { ok: false, message: INVALID }
  const id = match[1].toLowerCase()
  if (id.startsWith('r')) return { ok: false, message: RELEASE_ID }
  return { ok: true, id }
}
