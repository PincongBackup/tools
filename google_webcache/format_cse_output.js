// @ts-check
const fs = require("fs-extra")

const baseFilePath = "../../google_cached/"

const results =
    fs.readdirSync(baseFilePath)
        .filter((fileName) => {
            return fileName.startsWith("cse-")
        }).map((fileName) => {
            const data = fs.readFileSync(baseFilePath + fileName, "utf-8")

            const lines = data.split(/\n|\r\n/)
            lines[0] = ""
            lines[1] = "{"
            lines[lines.length - 1] = "}"

            /** @type {{ results: any[]; [x: string]: any; }} */
            const json = JSON.parse(lines.join("\n"))

            return json.results
        }).reduce((p, c) => {
            return p.concat(c)
        }, [])


const output = results.map((result) => {
    const { title, url, cacheUrl } = result

    const cacheID = cacheUrl.match(/q=cache:(.+?):/)[1]
    const postID = url.match(/\/p\/(\d+)/)[1]

    return {
        postID,
        title,
        link: url,
        cacheID
    }
}).sort((a, b) => {
    return +a.postID - +b.postID
})

fs.writeJSONSync("./cached_pages.json", output, { spaces: 4 })
