import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';

puppeteer.use(StealthPlugin());

export async function scrapeTouchgalPage(url: string) {
    if (!url || !url.startsWith('http')) {
        console.error("Invalid URL provided");
        return null;
    }

    console.log(`[TouchGal] Starting scrape for URL: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }) as unknown as Browser;

    try {
        const page = await browser.newPage();

        await page.setViewport({ width: 1920 + Math.floor(Math.random() * 100), height: 1080 + Math.floor(Math.random() * 100) });

        const cookies = [
            {
                name: 'cf_clearance',
                value: process.env.TOUCHGAL_CF_CLEARANCE || '',
                domain: '.touchgal.top'
            },
            {
                name: 'kun-galgame-patch-moe-token',
                value: process.env.TOUCHGAL_TOKEN || '',
                domain: '.touchgal.top'
            }
        ];
        await page.setCookie(...cookies);
        console.log(`[TouchGal] Cookies set.`);

        console.log(`[TouchGal] Navigating to page...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const data = await page.evaluate(() => {
            const title = document.querySelector('h1')?.innerText || document.title;

            let description = "";
            const els = Array.from(document.querySelectorAll('div, h2, h3'));
            const header = els.find((e: any) => e.innerText && e.innerText.trim() === '游戏介绍');
            if (header && header.parentElement) {
                description = header.parentElement.innerText.replace('游戏介绍', '').trim();
            } else {
                description = (document.querySelector('article') as HTMLElement)?.innerText || "";
            }

            if (description.includes('游戏截图')) {
                description = description.split('游戏截图')[0].trim();
            }

            const images = Array.from(document.querySelectorAll('img'))
                .map(img => img.src)
                .filter(src => src.includes('touchgaloss.com'));

            const excludeList = [
                'SFW', 'R18', 'Windows', 'Android', 'iOS', 'Mac', 'Linux',
                '简体中文', '繁体中文', '日语', 'English', 'PC游戏',
                '汉化资源', '补丁资源', '手机游戏', '模拟器资源', '其它', '外部链接', '全年龄'
            ];

            const tags = Array.from(document.querySelectorAll('div.rounded-full span'))
                .map(el => (el as HTMLElement).innerText)
                .filter(t => t && t.trim().length > 0 && t.length < 50)
                .filter(t => !excludeList.includes(t));

            const uniqueTags = [...new Set(tags)];

            return { title, description: description.substring(0, 1000), images, tags: uniqueTags };
        });

        return { ...data, url };

    } catch (error: any) {
        console.error(`[TouchGal] Error: ${error.message}`);
        return null;
    } finally {
        await browser.close();
    }
}
