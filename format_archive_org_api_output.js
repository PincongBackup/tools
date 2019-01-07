// @ts-check
const fs = require("fs-extra")
const { URL } = require("url")
const { parse: pathParse } = require("path")

// https://web.archive.org/cdx/search?url=pin-cong.com/&matchType=prefix&collapse=urlkey&output=json&fl=original,timestamp&filter=!statuscode:[45]..&limit=100000

const inputFilePath = "../cache/archive_org.json"
const outputFilePath = "../cache/archive_org_formatted.json"
const baseURL = "https://web.archive.org/web/2019/"

/** @type {String[][]} */
const data = fs.readJSONSync(inputFilePath)

const formattedData = data.map(([url, timestamp]) => {

    let path = new URL(url).pathname

    if (path.endsWith("/")) {
        path += "index.html"
    }

    if (!pathParse(path).ext) {
        path += "/index.html"
    }

    return [
        baseURL + url,
        decodeURIComponent(path),
        timestamp
    ]
})

// 去重，保留存档时间戳最大的项目
const allPathsSet = new Set(formattedData.map(x => x[1]))
const allPathsMap = new Map(
    [...allPathsSet].map(
        /** @returns {[ string, string[][] ]} */
        (path) => {
            return [path, []]
        }
    )
)

formattedData.forEach((x) => {
    const path = x[1]
    allPathsMap.get(path).push(x)
})

const output = [...allPathsMap.values()].map((xs) => {
    xs.sort((a, b) => {
        const timestampA = +a[2]
        const timestampB = +b[2]

        // 从大到小排序
        return timestampB - timestampA
    })

    const x = xs[0]
    const outputX = x.slice(0, 2)

    return outputX
})

fs.writeJSONSync(outputFilePath, output, { spaces: 4 })
