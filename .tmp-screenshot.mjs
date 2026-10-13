import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('theme', 'dark')
  localStorage.setItem('kun-migration-notice-dismissed', '1')
})
await page.goto('http://127.0.0.1:3000/identify', {
  waitUntil: 'networkidle0',
  timeout: 60000
})
for (const text of ['不再通知', '确定']) {
  const btn = await page.evaluateHandle((label) => {
    return [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.trim().includes(label)
    )
  }, text)
  const el = btn.asElement()
  if (el) {
    await el.click().catch(() => {})
    await new Promise((r) => setTimeout(r, 300))
  }
}
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: '/tmp/identify-mobile.png' })
const hasHScroll = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth
)
console.log('horizontal scroll:', hasHScroll)
await browser.close()
