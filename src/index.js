import Parser from './parser'
import _ from 'lodash';
import mkdirp from 'mkdirp';
import fs from 'fs'

const HOSPLITALS_URL = 'https://www.okijyu.jp/hospital-list.php';
const NEWS_URL = 'https://www.okijyu.jp/entry-blog.php';

(async () => {
  const parser = await new Parser()
  await parser.setup()
  await parser.goto(HOSPLITALS_URL)

  // parse hospitals
  const hospitalItems = await parser.page.$$eval(".item2", items => {
    dts = items.map(item => Array.from(item.querySelectorAll('dt'), dt => dt.textContent))
    dds = items.map(item => Array.from(item.querySelectorAll('dd'), dd => {
      if (dd.firstChild.nodeType === Node.TEXT_NODE) return dd.textContent.replace(/\n/, ' ')
      return dd.firstChild.getAttribute('href')
    }))
    return dts.map((e, i) => [e, dds[i]])
  })

  const hospitalNames = await parser.page.$$eval(".item2", items => {
    return items.map(item => item.querySelector('.mtitle-check').textContent)
  })

  const keys = {'TEL': 'tel', 'FAX': 'fax', '住所': 'address', '診療時間': 'bussinessHour', '休診日':'holiday', '獣医師':'doctors', 'HP': 'url'}
  const hospitals = []
  hospitalItems.forEach((item, index) => {
    const hospital = _.zipObject(item[0], item[1])
    Object.keys(hospital).forEach(key => {
      hospital[keys[key]] = hospital[key]
      delete hospital[key]
    })
    hospital['name'] = hospitalNames[index]
    hospitals.push(hospital)
  })

  fs.writeFile(`${__dirname}/../dist/hospitals.json`, JSON.stringify(hospitals), (error) => new Error(error))


  // parse emergency hospitals
  await parser.goto(NEWS_URL)
  const datas = await parser.page.$$eval('dd', list => {
    const datas = []
    for (let i = 0; i < list.length; i++) {
      const data = {
        href: list[i].firstChild.getAttribute('href'),
        textContent: list[i].textContent,
        innerHTML: list[i].innerHTML
      };
      datas.push(data)
    }
    return datas
  })

  const emergencyHospitalLinks = datas.filter(data => data.textContent.match(/^夜間診療案内/)).map(data => data.href)

  const hospitalsPerMonth = []
  for (let i = 0; i < emergencyHospitalLinks.length; i++) {
    const link = emergencyHospitalLinks[i]
    await parser.goto(`${NEWS_URL}${link}`)
    let emergencyHospitals = await parser.page.$eval('#contentwrap', item => {
      const emargencyHospitalsByDate = item.innerText.split(/(\r\n|\n|\r)/).filter(text => text.match(/^(\d{4}\/(\d{2}|\d{1})\/(\d{2}|\d{1}))/))
      return emargencyHospitalsByDate.map(eh => {
        target = eh.trim().replace(/[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).replace(/[‐－―]/g, "-")
        matchedDate = target.match(/\d{4}\/(\d{2}|\d{1})\/(\d{2}|\d{1})\(\D{1}\)/)
        matchedTel =target.match(/\d{3}-\d{4}/)
        hospitalNameRange = matchedTel ? (matchedTel.index - matchedDate[0].length) : null
        hospitalName = matchedTel ? target.substr(matchedDate[0].length, hospitalNameRange).trim() : target.substr(matchedDate[0].length).trim()
        result = {
          date: matchedDate[0],
          name: hospitalName
        }
        if (matchedTel) result['tel'] = matchedTel[0]
        return result
      })
    })

    hospitalsPerMonth.push({
      monthYear: emergencyHospitals[0].date.replace(/\/\d{1,}\(\D{1}\)$/, ''),
      hospitals: emergencyHospitals
    })
  }



  await mkdirp(`${__dirname}/../dist/emergency_hospitals`)
  for (const data of hospitalsPerMonth) {
    const filename = data.monthYear.replace(/\//, '_')
    fs.writeFile(`${__dirname}/../dist/emergency_hospitals/${filename}.json`, JSON.stringify(data.hospitals), (error) => new Error(error))
  }
  await parser.close()
})();