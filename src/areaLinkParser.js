import {
  launch
} from 'puppeteer';
const URL = 'http://okijyu.jp/hospital_list/map.html'
const AREALINKSELECTOR = "td a:not([href='#'])"
export default async function () {
  try {
    console.log('Start to scrap veterinary hospital area.')
    const browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    })
    const page = await browser.newPage()
    await page.goto(URL)
    const link = await page.evaluate((selector) => {
      const list = Array.from(document.querySelectorAll(selector))
      return [...new Set(list.map(data => data.href).filter(path => !path.toLowerCase().match(/^javascript:/)))]
    }, AREALINKSELECTOR);
    browser.close()
    return link
  } catch (error) {
    console.log(error)
  }
}