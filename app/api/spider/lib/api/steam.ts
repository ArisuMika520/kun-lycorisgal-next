import axios from 'axios';
import { VndbDetail, VndbRelease } from './vndb';


export function extractSteamId(vnDetail: VndbDetail, releases: VndbRelease[]): string | null {
    if (vnDetail.extlinks) {
        const steamLink = vnDetail.extlinks.find(l => l.label === "Steam" || l.url.includes("store.steampowered.com"));
        if (steamLink) {
            const match = steamLink.url.match(/app\/(\d+)/);
            if (match) return match[1];
        }
    }

    for (const release of releases) {
        if (release.extlinks) {
            const steamLink = release.extlinks.find(l => l.label === "Steam" || l.url.includes("store.steampowered.com"));
            if (steamLink) {
                const match = steamLink.url.match(/app\/(\d+)/);
                if (match) return match[1];
            }
        }
    }

    return null;
}

/**
 * Fetch Game Details from Steam Store API
 * @param appId Steam App ID
 * @param language Language code (english, japanese, schinese, tchinese)
 */
export async function fetchSteamStoreInfo(appId: string, language: string = 'english') {
    console.log(`[Steam] Fetching store info for AppID: ${appId} (Lang: ${language})`);
    try {
        const response = await axios.get('https://store.steampowered.com/api/appdetails', {
            params: {
                appids: appId,
                l: language
            }
        });

        const data = response.data[appId];
        if (data && data.success) {
            return data.data;
        }
        return null;
    } catch (error) {
        console.error(`[Steam] Failed to fetch store info: ${error}`);
        return null;
    }
}
