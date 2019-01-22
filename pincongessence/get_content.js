// @ts-check

const fs = require("fs")
const path = require("path")
const { JSDOM } = require("jsdom")

const inputDir = "../../pincongessence/backup/"
const outputDir = "../../pincongessence/content/"

const files = fs.readdirSync(inputDir)

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
const handler = (fileName) => {

    const inputFilePath = path.join(inputDir, fileName)
    const html = fs.readFileSync(inputFilePath, "utf-8")

    const { window: { document } } = new JSDOM(html)

    const articleElement = document.querySelector("article#_tl_editor")
    const content = articleElement.innerHTML

    const output = template.replace("{content}", content)

    const outputFilePath = path.join(outputDir, fileName)
    fs.writeFileSync(outputFilePath, output)

}

files.forEach(handler)
