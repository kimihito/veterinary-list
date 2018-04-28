import puppeteer from 'puppeteer';

export default class Parser {
  constructor() {
    this.browser = null
    this.page = null
  }

  async setup() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      })
    }

    if (!this.page) {
      this.page = await this.browser.newPage()
    }
  }

  async goto(url) {
    await this.page.goto(url)
  }

  async close() {
    await this.browser.close()
    this.browser = null
    this.page = null
  }

  async screenshot(path) {
    await this.page.screenshot({
      path: path
    })
  }

  async textFrom(selector) {
    await this.page.$eval(selector, el => el.innerText)
  }

  async elementsFrom(selector) {
    await this.page.evaluate(sel => {
      const elements = Array.from(document.querySelectorAll(sel))
      return [...new Set(elements.map(el => el))]
    }, selector)
  }

  async linksFrom(selector) {
    return await this.page.evaluate((sel) => {
      const elements = Array.from(document.querySelectorAll(sel))
      return [...new Set(elements.map(el => el.href).filter(path => path.toLowerCase().match(/^http(s?):/)))]
    }, selector)
  }
}