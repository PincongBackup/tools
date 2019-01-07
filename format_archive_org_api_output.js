// @ts-check
const fs = require("fs-extra")
const { URL } = require("url")
const { parse: pathParse } = require("path")

// https://web.archive.org/cdx/search?url=pin-cong.com/&matchType=prefix&collapse=urlkey&output=json&fl=original&filter=!statuscode:[45]..&limit=100000

const inputFilePath = "../cache/archive_org.json"
const outputFilePath = "../cache/archive_org_formatted.json"
const baseURL = "https://web.archive.org/web/2019/"

/** @type {String[][]} */
const data = fs.readJSONSync(inputFilePath)

const output = data.map(([url]) => {

    let path = new URL(url).pathname

    if (path.endsWith("/")) {
        path += "index.html"
    }

    if (!pathParse(path).ext) {
        path += "/index.html"
    }

    return [
        baseURL + url,
        decodeURIComponent(path)
    ]
}).reduce((p, x, index, array) => {
    // 去重
    if (array[index - 1] && array[index - 1][1] == x[1]) {
        return p
    } else {
        return [...p, x]
    }
}, [])

fs.writeJSONSync(outputFilePath, output, { spaces: 4 })
