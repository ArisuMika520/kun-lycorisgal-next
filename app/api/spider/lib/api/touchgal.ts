import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';

const client = axios.create({
    headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://www.touchgal.top',
        'Referer': 'https://www.touchgal.top/search',
        'Content-Type': 'application/json',
    }
});

export async function searchTouchgal(keyword: string) {
    console.log(`[TouchGal] Searching for: ${keyword}`);

    // Variations to try
    const variations = [
        { type: "all", lang: "all", plat: "all", opt: {} },
        { type: "", lang: "", plat: "", opt: {} },
        { type: "0", lang: "0", plat: "0", opt: {} },
        { type: "game", lang: "all", plat: "all", opt: {} },
    ];

    for (const v of variations) {
        const payload = {
            queryString: keyword,
            limit: 20,
            page: 1,
            searchOption: v.opt,
            selectedType: v.type,
            selectedLanguage: v.lang,
            selectedPlatform: v.plat,
            sortField: "created",
            sortOrder: "desc",
            selectedYears: [],
            selectedMonths: []
        };

        console.log(`[TouchGal] Trying payload variation: Type="${v.type}"...`);
        try {
            const res = await client.post('https://www.touchgal.top/api/search', payload);
            if (Array.isArray(res.data) && res.data.length > 0) {
                console.log(`[TouchGal] Success with variation.`);
                return res.data;
            } else {
                console.log(`[TouchGal] Returned empty array.`);
            }
        } catch (error: any) {
            console.error(`[TouchGal] Error: ${error.message}`);
            if (error.response) {
                // console.error(JSON.stringify(error.response.data));
            }
        }
    }

    return [];
}

export async function scrapeTouchgalGame(url: string) {
    console.log(`[TouchGal] Scraping URL: ${url}`);
    try {
        const response = await client.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        let jsonData = {};
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            try {
                const parsed = JSON.parse(nextData);
                jsonData = parsed.props?.pageProps || {};
            } catch (e) { }
        }

        return jsonData;
    } catch (error: any) {
        console.error(`[TouchGal] Scrape failed: ${error.message}`);
        return null;
    }
}
