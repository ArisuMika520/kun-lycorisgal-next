import axios from 'axios';
import { normalizeTitleStrict } from '../utils/normalize';
import { VndbDetail } from './vndb';

export async function searchBangumiSubject(keyword: string): Promise<any[]> {
    console.log(`[Bangumi] Searching for: ${keyword}`);
    try {
        const response = await axios.post('https://api.bgm.tv/v0/search/subjects', {
            keyword: keyword,
            filter: { type: [4] }, // Game
            sort: 'match'
        }, {
            headers: {
                'User-Agent': 'Antigravity/GalFetchDemo (https://github.com/google-deepmind)'
            }
        });

        return response.data?.data || [];
    } catch (error) {
        console.error(`[Bangumi] Search failed: ${error}`);
        return [];
    }
}

export async function fetchBangumiSubject(subjectId: number) {
    console.log(`[Bangumi] Fetching detail for ID: ${subjectId}`);
    try {
        const response = await axios.get(`https://api.bgm.tv/v0/subjects/${subjectId}`, {
            headers: {
                'User-Agent': 'Antigravity/GalFetchDemo (https://github.com/google-deepmind)'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`[Bangumi] Detail fetch failed: ${error}`);
        return null;
    }
}

export function pickBestBangumiSubject(
    { query, jaTitle }: { query: string; jaTitle: string | null },
    list: any[]
) {
    if (!Array.isArray(list) || !list.length) return null
    let best: any = null
    let bestScore = -Infinity
    const nQuery = normalizeTitleStrict(query)
    const nJa = normalizeTitleStrict(jaTitle || '')

    for (const c of list) {
        const name = c?.name || ''
        const nameCn = c?.name_cn || ''
        const nName = normalizeTitleStrict(name)
        const nNameCn = normalizeTitleStrict(nameCn)
        let s = 0

        if (nJa && nName === nJa) s += 120
        if (nJa && nNameCn === nJa) s += 120
        if (nName === nQuery) s += 100
        if (nNameCn === nQuery) s += 100
        if (nJa && (nName.includes(nJa) || nJa.includes(nName))) s += 70
        if (nJa && (nNameCn.includes(nJa) || nJa.includes(nNameCn))) s += 70
        if (nName.includes(nQuery) || nQuery.includes(nName)) s += 60
        if (nNameCn.includes(nQuery) || nQuery.includes(nNameCn)) s += 60
        if (nJa && nName.startsWith(nJa)) s += 20
        if (nJa && nNameCn.startsWith(nJa)) s += 20
        if (nName.startsWith(nQuery) || nNameCn.startsWith(nQuery)) s += 10
        if (c?.type === 4) s += 20

        if (s > bestScore) {
            best = c
            bestScore = s
        }
    }
    return best;
}

export async function getBangumiSubject(vnDetail: VndbDetail): Promise<any | null> {
    let jaTitle = vnDetail.titles.find(t => t.lang === 'ja' && t.official)?.title || vnDetail.alttitle || vnDetail.title;

    let list = await searchBangumiSubject(jaTitle);
    let best = pickBestBangumiSubject({ query: jaTitle, jaTitle }, list);

    if (best) return best;

    if (vnDetail.title !== jaTitle) {
        list = await searchBangumiSubject(vnDetail.title);
        best = pickBestBangumiSubject({ query: vnDetail.title, jaTitle }, list);
    }

    return best;
}
