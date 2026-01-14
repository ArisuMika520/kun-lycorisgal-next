import { fetchVndbDetail, fetchVndbReleases, VndbDetail } from './api/vndb';
import { getBangumiSubject, fetchBangumiSubject } from './api/bangumi';
import { fetchDlsiteInfo, extractRjCodeFromUrl } from './api/dlsite';
import { extractSteamId, fetchSteamStoreInfo } from './api/steam';
import { scrapeTouchgalPage } from './puppeteer_touchgal';
import { cleanText, isJapanese, isEnglish } from './utils/cleaner';
import { translateTag } from './utils/tagMap';

function getVndbTitle(detail: VndbDetail, lang: string): string | null {
    const exact = detail.titles.find(t => t.lang === lang && t.official);
    if (exact) return exact.title;
    const anyLang = detail.titles.find(t => t.lang === lang);
    if (anyLang) return anyLang.title;
    return null;
}

function extractDlsiteCode(vnDetail: VndbDetail, releases: any[]): string | null {
    if (vnDetail.extlinks) {
        for (const link of vnDetail.extlinks) {
            if (link.url && (link.url.includes("dlsite.com") || link.label.includes("DLsite"))) {
                const code = extractRjCodeFromUrl(link.url);
                if (code) return code;
            }
        }
    }
    for (const release of releases) {
        if (release.extlinks) {
            for (const link of release.extlinks) {
                if (link.url && (link.url.includes("dlsite.com") || link.label.includes("DLsite"))) {
                    const code = extractRjCodeFromUrl(link.url);
                    if (code) return code;
                }
            }
        }
    }
    if (vnDetail.aliases) {
        const rjAlias = vnDetail.aliases.find(a => a.toUpperCase().startsWith("RJ") || a.toUpperCase().startsWith("VJ"));
        if (rjAlias) return rjAlias.toUpperCase();
    }
    return null;
}

export async function fetchGameMetadata(inputVndbId?: string, inputRjCode?: string, inputTouchgalUrl?: string) {
    console.log(`[Spider] Fetching metadata for VNDB:${inputVndbId}, RJ:${inputRjCode}, TouchGal:${inputTouchgalUrl}`);

    let vndbData: any = null;
    let vndbReleases: any = [];
    let bangumiData: any = null;
    let dlsiteData: any = null;
    let steamDataEn: any = null;
    let steamDataJp: any = null;
    let touchgalData: any = null;

    // --- A. VNDB Update ---
    if (inputVndbId) {
        console.log(`[Fetch] Fetching VNDB: ${inputVndbId}`);
        vndbData = await fetchVndbDetail(inputVndbId);
        vndbReleases = await fetchVndbReleases(inputVndbId);
    }

    // --- B. DLsite Update ---
    let effectiveRjCode: string | null = inputRjCode || null;

    // Derive from VNDB if not explicit
    if (!effectiveRjCode && vndbData) {
        effectiveRjCode = extractDlsiteCode(vndbData, vndbReleases);
    }

    if (effectiveRjCode) {
        console.log(`[Fetch] Fetching DLsite: ${effectiveRjCode}`);
        dlsiteData = await fetchDlsiteInfo(effectiveRjCode);
    }

    if (inputTouchgalUrl) {
        console.log(`[Fetch] Scraping TouchGal: ${inputTouchgalUrl}`);
        touchgalData = await scrapeTouchgalPage(inputTouchgalUrl);
    }

    // --- D. Derived Updates (Steam, Bangumi) ---
    let steamId: string | null = null;
    if (vndbData) {
        // Steam
        steamId = extractSteamId(vndbData, vndbReleases);
        if (steamId) {
            console.log(`[Fetch] Fetching Steam: ${steamId}`);
            steamDataEn = await fetchSteamStoreInfo(steamId, 'english');
            steamDataJp = await fetchSteamStoreInfo(steamId, 'japanese');
        }
        // Bangumi
        const bangumiMatch = await getBangumiSubject(vndbData);
        if (bangumiMatch) {
            console.log(`[Fetch] Fetching Bangumi: ${bangumiMatch.id}`);
            bangumiData = await fetchBangumiSubject(bangumiMatch.id);
        }
    }

    // --- Assembly ---
    let nameCn = touchgalData?.title || bangumiData?.name_cn || (vndbData ? (getVndbTitle(vndbData, 'zh-Hans') || getVndbTitle(vndbData, 'zh-Hant')) : null) || null;

    const nameJp = (vndbData ? getVndbTitle(vndbData, 'ja') : null) || bangumiData?.name || dlsiteData?.title_jp || null;
    const nameEn = (vndbData ? getVndbTitle(vndbData, 'en') : null) || steamDataEn?.name || (vndbData ? vndbData.alttitle : null) || null;

    // Description
    let descCn = null;
    if (touchgalData?.description) {
        descCn = touchgalData.description; // Priority 1
    } else if (bangumiData && !isJapanese(bangumiData.summary)) {
        descCn = cleanText(bangumiData.summary); // Priority 2
    }

    let descJp = cleanText(steamDataJp?.detailed_description);
    if (descJp && isEnglish(descJp)) descJp = null;
    if (!descJp && dlsiteData?.description) {
        descJp = cleanText(dlsiteData.description);
    }

    let descEn = vndbData ? cleanText(vndbData.description) : null;
    if (!descEn) descEn = cleanText(steamDataEn?.detailed_description);

    // Companies
    const companies: any[] = [];
    if (vndbData && vndbData.developers) {
        vndbData.developers.forEach((d: any) => companies.push({
            id: d.id, name: d.name, original: d.original, type: 'Developer'
        }));
    }
    if (dlsiteData?.circle_name) {
        const exists = companies.find(c => c.name === dlsiteData.circle_name || c.original === dlsiteData.circle_name);
        if (!exists) {
            companies.push({ id: 'dlsite_circle', name: dlsiteData.circle_name, original: dlsiteData.circle_name, type: 'Circle' });
        }
    }

    // Tags
    const tagMap = new Map<string, number>();
    if (bangumiData && bangumiData.tags) {
        bangumiData.tags.forEach((t: any) => tagMap.set(t.name, t.count || 0));
    }
    if (touchgalData?.tags) {
        touchgalData.tags.forEach((rawTag: string) => {
            const tagName = rawTag.replace(/\s+\+\d+$/, '').trim();
            if (tagName && !tagMap.has(tagName)) {
                tagMap.set(tagName, 0);
            }
        });
    }
    // Add Company as tags too
    companies.forEach(c => {
        // Add company name as tag
        tagMap.set(c.name, 999);
        if (c.original) tagMap.set(c.original, 999);
    });

    const sortedTags = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);

    // Aliases
    const aliases = new Set<string>();
    if (vndbData?.aliases) vndbData.aliases.forEach((a: string) => aliases.add(a));
    if (bangumiData) {
        if (bangumiData.name && bangumiData.name !== nameJp) aliases.add(bangumiData.name);
        if (bangumiData.name_cn && bangumiData.name_cn !== nameCn) aliases.add(bangumiData.name_cn);
    }
    if (touchgalData?.title && touchgalData.title !== nameCn && touchgalData.title !== nameJp) {
        aliases.add(touchgalData.title);
    }

    // Images
    const images: string[] = [];
    if (vndbData?.image?.url) images.push(vndbData.image.url);
    if (steamDataEn?.screenshots) {
        steamDataEn.screenshots.forEach((s: any) => {
            if (s.path_thumbnail) images.push(s.path_thumbnail);
        });
    }
    // Dlsite images if needed?

    // Website (for description)
    const websites: { label: string, url: string }[] = [];
    if (vndbReleases && vndbReleases.length > 0) {
        for (const r of vndbReleases) {
            if (r.extlinks) {
                r.extlinks.forEach((l: any) => {
                    if (l.label === "Official website") websites.push({ label: "官网", url: l.url });
                });
            }
        }
    }

    // Prefer Official Website URL
    const websiteUrl = websites.length > 0 ? websites[0].url : "";

    return {
        name: nameCn || nameJp || nameEn,
        introduction: descCn || descJp || descEn,
        released: vndbData?.released || dlsiteData?.release_date || null,
        vndbId: vndbData?.id || null,
        dlsiteId: effectiveRjCode,
        alias: Array.from(aliases),
        tag: sortedTags.slice(0, 40),
        banner: images.length > 0 ? images[0] : null,
        screenshots: images,
        website: websiteUrl,
        companies
    };
}
