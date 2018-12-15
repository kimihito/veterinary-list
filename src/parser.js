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
          '--disable-setuid-sandbox',
          '--lang=ja,en-US,en'
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
}