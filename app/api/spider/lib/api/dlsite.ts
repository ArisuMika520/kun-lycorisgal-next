import axios from 'axios';


export async function fetchDlsiteInfo(rjCode: string) {
    if (!rjCode) return null;
    console.log(`[DLsite] Fetching info for code: ${rjCode}`);
    try {
        const apiUrl = process.env.KUN_DLSITE_API_URL || 'https://dlapi.arisumika.top/api/dlsite';
        const response = await axios.get(`${apiUrl}?code=${rjCode}`);
        return response.data.data;
    } catch (error) {
        console.error(`[DLsite] Failed to fetch info for ${rjCode}: ${error}`);
        return null;
    }
}

export function extractRjCodeFromUrl(url: string): string | null {
    const match = url.match(/product_id\/(RJ\d+|VJ\d+)/i);
    if (match) return match[1].toUpperCase();

    const directMatch = url.match(/^(RJ\d+|VJ\d+)$/i);
    if (directMatch) return directMatch[1].toUpperCase();

    return null;
}
