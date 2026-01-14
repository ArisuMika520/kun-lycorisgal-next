import axios from 'axios';

export interface VndbDetail {
    id: string;
    title: string;
    alttitle: string;
    titles: { lang: string; title: string; main: boolean; official: boolean }[];
    aliases: string[];
    description: string;
    developers: { id: string; name: string; original: string }[];
    tags: { id: string; name: string; category: string; rating: number; spoiler: number }[];
    released: string;
    extlinks: { url: string; label: string; name: string; id: string }[];
    image: { url: string; dims: number[]; sexual: number; violence: number; votecount: number };
    length_minutes: number;
    rating: number;
    votecount: number;
    releases: {
        id: string;
        title: string;
        released: string;
        extlinks: { url: string; label: string; name: string; id: string }[];
    }[];
}

export interface VndbRelease {
    id: string;
    title: string;
    released: string;
    extlinks: { url: string; label: string; name: string; id: string }[];
}

export async function fetchVndbDetail(vndbId: string): Promise<VndbDetail | null> {
    console.log(`[VNDB] Fetching details for ${vndbId}...`);
    try {
        const response = await axios.post('https://api.vndb.org/kana/vn', {
            filters: ["id", "=", vndbId],
            fields: [
                "id", "title", "alttitle",
                "titles.lang", "titles.title", "titles.main", "titles.official",
                "aliases", // Added aliases
                "description",
                "developers.name", "developers.original",
                "tags.name", "tags.category", "tags.rating", "tags.spoiler",
                "released",
                "extlinks.url", "extlinks.label", "extlinks.name", "extlinks.id",
                "image.url", "image.dims", "image.sexual", "image.violence", "image.votecount",
                "length_minutes", "rating"
            ].join(", ")
        });

        if (response.data && response.data.results && response.data.results.length > 0) {
            return response.data.results[0];
        } else {
            console.warn(`[VNDB] No results found for ${vndbId}`);
            return null;
        }
    } catch (error: any) {
        console.error(`[VNDB] Error fetching details: ${error.message}`);
        return null;
    }
}

export async function fetchVndbReleases(vndbId: string): Promise<VndbRelease[]> {
    console.log(`[VNDB] Fetching releases for ${vndbId}...`);
    try {
        const response = await axios.post('https://api.vndb.org/kana/release', {
            filters: ["vn", "=", ["id", "=", vndbId]],
            fields: "id, title, released, extlinks.url, extlinks.label, extlinks.name, extlinks.id"
        });

        if (response.data && response.data.results) {
            return response.data.results;
        }
        return [];
    } catch (error: any) {
        console.error(`[VNDB] Error fetching releases: ${error.message}`);
        return [];
    }
}
