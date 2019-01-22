// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { JSDOM } = require("jsdom")
const { HTML2BBCode } = require("html2bbcode")
const upload = require("../imgur_upload")

const officialListFilePath = "../../pincongessence/official_list.json"
const listFilePath = "../../pincongessence/list.json"

const inputDir = "../../pincongessence/backup/"
const outputDir = "../../pincongessence/bbcode/"

const bbcodeConverter = new HTML2BBCode({
    noalign: true,
    noheadings: true,
})

/**
 * @param {string} fileName
 * @param {number} index
 */
const handler = async (fileName, index) => {

    const inputFilePath = path.join(inputDir, fileName)
    const html = await fs.readFile(inputFilePath, "utf-8")

    const { window: { document } } = new JSDOM(html)

    const articleElement = document.querySelector("article#_tl_editor")

    const titleElement = articleElement.children[0]
    titleElement.outerHTML = `<b>${titleElement.textContent.trim()}</b><br>`

    const addressElement = document.querySelector("article#_tl_editor > address")
    const author = addressElement.textContent.trim()
    if (author) {
        addressElement.innerHTML = "<br><br>[i]@" + author + "：[/i]<br><br>"
    }

    const imgs = articleElement.querySelectorAll("img")
    await Promise.all(
        [...imgs].map(async (img) => {
            const url = img.src

            try {
                img.src = await upload(url)
            } catch (e) {
                console.error(fileName + " " + url + " " + e)
            }
        })
    )

    const H4List = articleElement.querySelectorAll("h4")
    if (H4List.length > 0) {
        const lastH4 = H4List[H4List.length - 1]
        lastH4.after(addressElement)

        H4List.forEach((h4) => {
            h4.outerHTML = `<br><b class="h4">${h4.innerHTML}</b><br>`
        })
    }

    const title = document.querySelector(".tl_article_header > h1").textContent.trim()
    const quote = `\n[quote]${index + 1}. ${title}[/quote]\n\n`

    const content = articleElement.innerHTML
    const bbcode = bbcodeConverter.feed(content)
    const output = quote + bbcode.toString()

    const outputFilePath = path.join(outputDir, `${index + 1}.bbcode`)
    fs.ensureDirSync(path.parse(outputFilePath).dir)
    await fs.writeFile(outputFilePath, output)

}

const main = async (start = 0) => {

    /** @type {{ link: string; }[]} */
    const officialList = (await fs.readJSON(officialListFilePath)).slice(0, 736)

    /** @type {{ link: string; messageLink: string; }[]} */
    const list = await fs.readJSON(listFilePath)

    const articlesMap = new Map(
        list.map((x) => {
            const { link, messageLink } = x
            const fileName = link.split("/").pop() + ".html"

            /** @type {[string, string]} */
            const article = [messageLink, fileName]

            return article
        })
    )

    const l = officialList.map((x, index) => {
        return {
            fileName: articlesMap.get(x.link),
            index,
        }
    })

    const n = 2
    for (let i = start; i <= l.length; i = i + n) {

        await Promise.all(
            l.slice(i, i + n).map(({ fileName, index }) => {
                return handler(fileName, index)
            })
        )

    }
}

main()
