import {
  launch
} from 'puppeteer';
import getUrls from 'get-urls';

const NAMESELECOTOR = 'td[bgcolor="#0891B9"] span[class=style7]'
const TELSELECTOR = 'td[bgcolor="#0891B9"] span[class=style6]'
const ADDRESSSELECTOR = "table[width='310'], table[width='320']"

export default async function (url) {
  try {
    console.log(`Start to scrap from ${url}`)
    const browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    })
    const page = await browser.newPage()

    await page.goto(url)
    const nameText = await page.$eval(NAMESELECOTOR, el => el.innerText)
    const telText = await page.$eval(TELSELECTOR, el => el.innerText)
    const addressText = await page.$eval(ADDRESSSELECTOR, el => el.innerText)
    const hospital = {
      name: nameText,
      tel: telText.replace(/^TEL :/, '').trim(),
      address: addressText.replace(/■ 住所/g, '').trim().replace(/\s+/g, ' ')
    }
    let hospitalData = null
    if (url.match(/05_nanbu|06_ritou/)) {
      hospitalData = await page.evaluate(selector => {
        const htmls = Array.from(document.querySelectorAll(selector))
        const arr = []
        for (let i = 0; i < htmls.length; i += 2) {
          const el1 = htmls[i]
          const el2 = htmls[i + 1]
          arr.push({
            text: (el1.innerText + el2.innerText).trim(),
            html: (el1.innerHTML + el2.innerHTML).trim()
          })
        }
        return arr
      }, 'td[width="180"] table tr')
    } else {
      hospitalData = await page.evaluate(selector => {
        const htmls = Array.from(document.querySelectorAll(selector))
        return htmls.map(el => {
          return {
            text: el.innerText.trim(),
            html: el.innerHTML
          }
        })
      }, 'td[width="180"] table')
    }

    for (const data of hospitalData) {
      if (data.text.match(/ホームページ/)) {
        const urls = [...getUrls(data.html)].map(url => {
          const decodedTexts = decodeURI(url).split(decodeURI("'"))
          if (decodedTexts.length == 1) return url
          return decodedTexts[0]
        })
        hospital.url = urls.join(', ')
      }

      if (data.text.match(/獣医師/)) {
        hospital.doctors = data.text.replace(/■ 獣医師/g, '').trim().replace(/\n/g, ', ').replace(/\s+/g, ' ')
      }
      if (data.text.match(/FAX/)) {
        hospital.fax = data.text.replace(/■ FAX|\s/g, '')
      }
      if (data.text.match(/診療時間/)) {
        // 元と挙動違っちゃうけども
        hospital.businessHour = data.text.replace(/■ 診療時間/g, '').trim().replace(/\s+/g, ', ')
      }
      if (data.text.match(/休診日/)) {
        hospital.holiday = data.text.replace(/■ 休診日|※休診日|\s/g, '')
      }
    }
    browser.close()
    return hospital
  } catch (error) {
    console.log(error)
  }
}