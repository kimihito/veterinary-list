import Parser from './parser'
import hospitalParser from './hospitalParser'
import emergencyHospitalParser from './emergencyHospitalParser'
import mkdirp from 'mkdirp'
import fs from 'fs'
import {
  URL
} from 'url'

const MAPURL = 'http://okijyu.jp/hospital_list/map.html';

(async () => {
  const parser = await new Parser()
  await parser.setup()
  await parser.goto(MAPURL)
  const areaLinks = await parser.linksFrom("td a:not([href='#'])")
  const hospitalLinks = []
  for (const link of areaLinks) {
    await parser.goto(link)
    const areaPath = new URL(link).pathname.split('/').pop().replace(/\.html$/, '')
    const hospitalLink = await parser.linksFrom(`a[href*='${areaPath}/']`)
    hospitalLinks.push(...hospitalLink)
  }

  const hospitals = []
  for (const link of hospitalLinks) {
    const hospital = await hospitalParser(parser, link)
    hospitals.push(hospital)
  }
  fs.writeFile(`${__dirname}/../dist/hospitals.json`, JSON.stringify(hospitals), (error) => new Error(error))

  // parse emergency hospitals
  const emergencyDatas = await emergencyHospitalParser(parser)
  await mkdirp(`${__dirname}/../dist/emergency_hospitals`)
  for (const data of emergencyDatas) {
    const filename = data.monthYear.replace(/\//, '_')
    fs.writeFile(`${__dirname}/../dist/emergency_hospitals/${filename}.json`, JSON.stringify(data.hospitals), (error) => new Error(error))
  }
  await parser.close()
})();