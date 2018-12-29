// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { fetch, getProxyAgent } = require("./util")
const { cx, key } = require("./api_key")

const agent = getProxyAgent()

const baseFilePath = "../google_cached/"
const apiURL = `https://www.googleapis.com/customsearch/v1?q=site%3Awww.pin-cong.com&cx=${cx}&prettyPrint=true&key=${key}&start=`

/**
 * @param {number} start 
 */
const download = async (start) => {
    const end = start + 9
    const saveTo = `${start}-${end}.json`

    try {
        const r = await fetch(apiURL + start, {
            timeout: 10000,
            agent
        })
        if (r.ok) {
            const filePath = path.resolve(
                path.join(baseFilePath, saveTo)
            )

            fs.ensureDirSync(path.parse(filePath).dir)
            const fileStream = fs.createWriteStream(filePath)

            r.body.pipe(fileStream)

            await new Promise((resolve) => {
                fileStream.on("close", () => {
                    resolve()
                })
            })

        } else {
            if (r.status != 404) console.error(saveTo + " " + r.status)
            return
        }
    } catch (e) {
        return console.error(saveTo + " " + e)
    }

}

const downloadAll = async () => {

    for (let i = 1; i <= 5060; i += 10) {
        await download(i)
    }

}


downloadAll()
