// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { fetch, getProxyAgent } = require("../util")
const { cx, token } = require("./api_key")

const agent = getProxyAgent()

const baseFilePath = "../../google_cached/"
const apiURL = `https://cse.google.com/cse/element/v1?cx=${cx}&cse_tok=${token}&q=site%3Apin-cong.com&safe=off&callback=cb&start=`

/**
 * @param {number} start 
 */
const download = async (start) => {
    const end = start + 9
    const saveTo = `cse-${start}-${end}.json`

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

    for (let i = 1; i <= 298; i += 10) {
        await download(i)
    }

}


downloadAll()
