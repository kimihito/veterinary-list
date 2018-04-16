import {
  launch
} from "puppeteer";

import striptags from 'striptags';

import getUrls from 'get-urls';

import fs from 'fs';

const SELECTOR = "td a:not([href='#'])";

const URL = 'http://okijyu.jp/hospital_list/map.html';

(async () => {
  const browser = await launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const page = await browser.newPage();
  await page.goto(URL);
  const areaLinks = await page.evaluate((selector) => {
    const list = Array.from(document.querySelectorAll(selector))
    return [...new Set(list.map(data => data.href).filter(path => !path.toLowerCase().match(/^javascript:/)))]
  }, SELECTOR);

  let veterinaryLinks = []

  for (let i = 0; i < areaLinks.length; i++) {
    await page.goto(areaLinks[i])

    let areaVeterinaryLinks = await page.evaluate((selector) => {
      const list = Array.from(document.querySelectorAll(selector))
      return list.map(link => link.href)
    }, "table table table td a:not([href='#'])");

    veterinaryLinks.push(areaVeterinaryLinks)
  }

  veterinaryLinks = veterinaryLinks.reduce(
    (accumulator, currentValue) => accumulator.concat(currentValue), []
  )

  let veterinaries = []

  for (let i = 0; i < veterinaryLinks.length; i++) {
    const url = veterinaryLinks[i]
    await page.goto(url)
    const titleText = await page.$eval('td[bgcolor="#0891B9"] span[class=style7]', el => el.innerText)
    const telText = await page.$eval('td[bgcolor="#0891B9"] span[class=style6]', el => el.innerText)
    const addressText = await page.$eval("table[width='310'], table[width='320']", el => el.innerText)
    let veterinaryData = null
    if (url.match(/05_nanbu|06_ritou/)) {
      veterinaryData = await page.evaluate(selector => {
        const htmls = Array.from(document.querySelectorAll(selector))
        let arr = []
        for (let i = 0; i < htmls.length; i += 2) {
          arr.push([htmls[i].innerHTML, htmls[i + 1].innerHTML].join('').trim())
        }
        return arr
      }, 'td[width="180"] table tr')
    } else {
      veterinaryData = await page.evaluate(selector => {
        const htmls = Array.from(document.querySelectorAll(selector))
        let arr = htmls.map(el => el.innerHTML.trim())
        return arr
      }, 'td[width="180"] table')

    }

    let hash = {}
    for (let i = 0; i < veterinaryData.length; i++) {
      const data = veterinaryData[i]
      if (data.match(/ホームページ/)) {
        let urls = [...getUrls(data)].map(text => {
          const decodedTexts = decodeURI(text).split(decodeURI("'"))
          if (decodedTexts.length == 1) return text
          return decodedTexts[0]
        })
        hash['url'] = urls.join(', ')
      }
      if (data.match(/獣医師/)) {
        hash['doctors'] = striptags(data, '<br>').replace(/■ 獣医師|&nbsp;/g, '').split(/\s/g).filter(text => text != "").join(' ').split('<br>').join(',')
      }

      if (data.match(/FAX/)) {
        hash['fax'] = striptags(data).replace(/■ FAX|&nbsp;/g, '').split(/\s/g).filter(text => text != "").join('')
      }
      if (data.match(/診療時間/)) {
        hash['businessHour'] = striptags(data).replace(/■ 診療時間|&nbsp;/g, '').split(/\s/g).filter(text => text != "").join(', ')
      }

      if (data.match(/休診日/)) {
        hash['holiday'] = striptags(data).replace(/■ 休診日|※休診日|&nbsp;/g, '').split(/\s/g).filter(text => text != "").join('')
      }
    }

    let veterinary = {
      name: decodeURI(striptags(titleText).trim()),
      tel: striptags(telText).replace(/^TEL :/, '').trim(),
      address: addressText.replace(/■ 住所/g, '').split(/\s/g).filter(text => text != "").join(' ')
    }

    veterinary = Object.assign(veterinary, hash)
    veterinaries.push(veterinary)
  }

  browser.close();
  fs.writeFileSync('./dist/veterinaries.json', JSON.stringify(veterinaries, null, ' '))
})();