import fs from 'fs';
import areaLinkParser from './src/areaLinkParser';
import areaHospitalLinkParser from './src/areaHospitalLinkParser';
import hospitalParser from './src/hospitalParser';

(async () => {
  const areaLinks = await areaLinkParser()
  const hospitalLinks = []
  for (const url of areaLinks) {
    const hospitalLink = await areaHospitalLinkParser(url)
    hospitalLinks.push(...hospitalLink)
  }

  const hospitals = []
  for (const url of hospitalLinks) {
    const hospital = await hospitalParser(url)
    hospitals.push(hospital)
  }
  fs.writeFileSync('./dist/hospitals.json', JSON.stringify(hospitals, null, ' '))
})();