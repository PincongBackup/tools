// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { JSDOM } = require("jsdom")
const { fetch, getProxyAgent } = require("../util")

const baseURL = "https://webcache.googleusercontent.com/search?vwsrc=1&q=cache:"
const baseFilePath = "../../p/"
const agent = getProxyAgent()

const loadMetaData = (file) => {
    const filePath = path.join(baseFilePath, file)

    if (fs.existsSync(filePath)) {
        return fs.readJSONSync(path.join(baseFilePath, file)) || []
    } else {
        return []
    }
}

/**
 * @param {string} file 
 * @param {Iterable} metadata 
 */
const saveMetaData = (file, metadata) => {
    return fs.writeJSON(
        path.join(baseFilePath, file),
        [...metadata].sort(),
        { spaces: 4 }
    )
}

const failed = new Set(loadMetaData("uploads_failed.json"))
const successful = new Set(loadMetaData("uploads_successful.json"))


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
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0",
            },
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

            failed.delete(url)
            successful.add(url)

            return
        } else {
            console.error(url + " " + r.status + " " + r.statusText)
            failed.add(url)
            return
        }
    } catch (e) {
        failed.add(url)
        return console.error(saveTo + " " + e)
    }

}

/**
 * @param {Page[]} pages 
 */
const downloadAll = async (pages) => {

    await Promise.all(
        pages.map((page) => {
            return download(page)
        })
    )

    saveMetaData("uploads_failed.json", failed)
    saveMetaData("uploads_successful.json", successful)

    console.log(successful.size + " 项下载成功")
    console.log(failed.size + " 项下载失败")

}

const main = async (start = 0) => {

    /** @type {Page[]} */
    const cachedPages = await fs.readJSON("./cached_pages.json")

    // 绕过网站的并发限制
    const n = 2
    for (let i = start; i <= cachedPages.length; i = i + n) {
        await downloadAll(cachedPages.slice(i, i + n))
    }

}


main()
