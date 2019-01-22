// @ts-check

const fs = require("fs-extra")
const path = require("path")
const { JSDOM } = require("jsdom")
const { fetch, getProxyAgent } = require("../util")

const agent = getProxyAgent()

const inputDir = "../../pincongessence/backup/"
const outputDir = "../../pincongessence/content/"

const template = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
    </head>
    <body>
        {content}
    </body>
</html>`

/**
 * @param {string} fileName
 */
const handler = async (fileName) => {

    const inputFilePath = path.join(inputDir, fileName)
    const html = await fs.readFile(inputFilePath, "utf-8")

    const { window: { document } } = new JSDOM(html)

    const articleElement = document.querySelector("article#_tl_editor")

    const imgs = articleElement.querySelectorAll("img")

    await Promise.all(
        [...imgs].map(async (img) => {
            const url = img.src

            try {
                const r = await fetch(url, {
                    timeout: 10000,
                    agent
                })
                if (r.ok) {
                    const mime = r.headers.get("content-type")
                    const data = await r.buffer()
                    const base64 = data.toString("base64")
                    const dataURL = `data:${mime};base64,${base64}`

                    img.src = dataURL
                } else {
                    console.error(url + " " + r.status)
                }
            } catch (e) {
                console.error(url + " " + e)
            }
        })
    )

    const content = articleElement.innerHTML
    const output = template.replace("{content}", content)

    const outputFilePath = path.join(outputDir, fileName)
    await fs.writeFile(outputFilePath, output)

}

const main = async (start = 0) => {

    const files = fs.readdirSync(inputDir)

    const n = 10
    for (let i = start; i <= files.length; i = i + n) {

        await Promise.all(
            files.slice(i, i + n).map((fileName) => {
                return handler(fileName)
            })
        )

    }
}

main()
