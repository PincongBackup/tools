// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { fetch, getProxyAgent } = require("../util")

const agent = getProxyAgent()

const baseFilePath = "../../pincongessence/backup/"
const jsonFilePath = "../../pincongessence/list.json"

/**
 * @param {string} url 
 * @param {string} saveTo 
 */
const download = async (url, saveTo) => {
    try {
        const r = await fetch(url, {
            timeout: 10000,
            agent
        })
        if (r.ok) {
            const imgPath = path.resolve(
                path.join(baseFilePath, saveTo)
            )

            fs.ensureDirSync(path.parse(imgPath).dir)
            const fileStream = fs.createWriteStream(imgPath)

            r.body.pipe(fileStream)

            await new Promise((resolve) => {
                fileStream.on("close", () => {
                    resolve()
                })
            })

        } else {
            console.error(url + " " + r.status)
            return
        }
    } catch (e) {
        console.error(url + " " + e)
        return
    }

}


/**
 * @param {number=} start 
 * @param {number=} start 
 */
const main = async (start = 0, end = 738) => {

    /** @type {import("./get_list.js").ListItem[]} */
    const data = fs.readJSONSync(jsonFilePath)

    // 绕过网站的并发限制
    const n = 20
    for (let i = start; i <= Math.min(data.length, end); i = i + n) {

        await Promise.all(
            data.slice(i, Math.min(i + n, end)).map((x) => {
                const url = encodeURI(x.link.replace(/^http:/, "https:"))
                const saveTo = x.link.split("/").pop() + ".html"
                return download(url, saveTo)
            })
        )

    }
}

main()
