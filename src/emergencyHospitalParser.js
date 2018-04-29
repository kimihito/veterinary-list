import util from 'util';

export default async function (parser) {
  try {
    const URL = 'http://www.okijyu.jp/info/'
    await parser.goto(URL)
    const datas = await parser.page.$$eval('#info td.info a', list => {
      const datas = []
      for (let i = 0; i < list.length; i++) {
        const data = {
          href: list[i].href,
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
      await parser.goto(link)
      let hospitals = await parser.page.$eval('table[width="540"][align="center"] tbody', item => {
        const arr = item.innerText.split("\n").filter(text => text.match(/\d{4}\/(\d{1}|\d{2})\/(\d{1}|\d{2})/) && !text.match(/事務局/)).map(text => {
          data = text.trim().split(/\t{1,}/)
          return {
            date: data[0],
            name: data[1],
            tel: data[2]
          }
        })
        return arr
      })

      hospitals = hospitals.map(hospital => {
        let tel = null
        if (!util.isUndefined(hospital.tel)) {
          tel = hospital.tel.replace(/./g, (s) => {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
          })
        }
        hospital.tel = tel
        return hospital
      })
      hospitalsPerMonth.push({
        monthYear: hospitals[0].date.replace(/\/\d{1,}\(\D{1}\)$/, ''),
        hospitals: hospitals
      })
    }
    return hospitalsPerMonth
  } catch (err) {
    new Error(err)
  }
}