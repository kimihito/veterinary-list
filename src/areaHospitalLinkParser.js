import {
  launch
} from 'puppeteer';

const SELECTOR = "table table table td a:not([href='#'])"
export default async function (url) {
  try {
    console.log(`Start to scrap hospital links from ${url}.`)
    const browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    })
    const page = await browser.newPage()
    await page.goto(url)
    const link = await page.evaluate((selector) => {
      const elements = Array.from(document.querySelectorAll(selector))
      return elements.map(el => el.href)
    }, SELECTOR)
    browser.close()
    return link
  } catch (error) {
    console.log(error)
  }
}