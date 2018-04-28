import Parser from './parser'
import hospitalParser from './hospitalParser'
import fs from 'fs'

const URL = 'http://okijyu.jp/hospital_list/map.html';

(async () => {
  const parser = await new Parser()
  await parser.setup()
  await parser.goto(URL)
  const areaLinks = await parser.linksFrom("td a:not([href='#'])")
  const hospitalLinks = []
  for (const link of areaLinks) {
    await parser.goto(link)
    const hospitalLink = await parser.linksFrom("table table table td a:not([href='#'])")
    hospitalLinks.push(...hospitalLink)
  }

  const hospitals = []
  for (const link of hospitalLinks) {
    const hospital = await hospitalParser(parser, link)
    hospitals.push(hospital)
  }
  await parser.close()
  fs.writeFile(`${__dirname}/../dist/hospitals.json`, JSON.stringify(hospitals), (error) => new Error(error))
})();