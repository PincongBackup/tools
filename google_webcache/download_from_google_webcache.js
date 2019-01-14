// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { JSDOM } = require("jsdom")
const { fetch, getProxyAgent } = require("../util")

const baseURL = "https://webcache.googleusercontent.com/search?vwsrc=1&q=cache:"
const baseFilePath = "../../p/"
const agent = getProxyAgent()

/**
 * @typedef {{ postID: number; title: string; link: string; cacheID: string; }} Page
 */

/**
 * @param {Page} page 
 */
const download = async (page) => {
    const saveTo = `${page.postID}/index.html`
    const url = baseURL + page.cacheID + ":" + page.link

    try {
        const r = await fetch(url, {
            timeout: 10000,
            agent
        })
        if (r.ok) {
            const filePath = path.resolve(
                path.join(baseFilePath, saveTo)
            )

            fs.ensureDirSync(path.parse(filePath).dir)

            const html = await r.textConverted()
            const { window: { document } } = new JSDOM(html)

            const pageHTML = document.body.querySelector("div > pre").textContent
            await fs.writeFile(filePath, pageHTML)

            return
        } else {
            console.error(saveTo + " " + r.status)
            return
        }
    } catch (e) {
        return console.error(saveTo + " " + e)
    }

}

const downloadAll = async () => {

    /** @type {Page[]} */
    const cachedPages = await fs.readJSON("./cached_pages.json")

    await Promise.all(
        cachedPages.map((page) => {
            return download(page)
        })
    )

}


downloadAll()
