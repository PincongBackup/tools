// @ts-check
const fs = require("fs-extra")
const path = require("path")
const { fetch, getProxyAgent } = require("./util")

const agent = getProxyAgent()

const baseFilePath = "../"
const jsonFilePath = "../cache/archive_org_formatted.json"
const baseURL = ""


const loadMetaData = (file) => {
    const filePath = path.join(baseFilePath, file)

    if (fs.existsSync(filePath)) {
        return JSON.parse(
            fs.readFileSync(filePath, "utf-8")
        ) || []
    } else {
        return []
    }
}


const failed = new Set(loadMetaData("uploads_failed.json"))
const successful = new Set(loadMetaData("uploads_successful.json"))

/**
 * @param {string} f 
 * @param {string=} saveTo 
 */
const download = async (f, saveTo = f) => {
    try {
        const r = await fetch(baseURL + f, {
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
                    failed.delete(f)
                    successful.add(f)
                    resolve()
                })
            })

        } else {
            failed.add(f)
            if (r.status != 404) console.error(f + " " + r.status)
            return
        }
    } catch (e) {
        failed.add(f)
        return console.error(f + " " + e)
    }

}


/**
 * @param {string} file 
 * @param {Iterable} metadata 
 */
const saveMetaData = (file, metadata) => {
    return fs.writeFile(
        path.join(baseFilePath, file),
        JSON.stringify(
            [...metadata].sort(),
            null, 4
        )
    )
}


/**
 * @typedef {[string, string]} DataItem [下载地址, 保存路径]
 */

/**
 * @param {DataItem[]} data 
 */
const downloadAll = async (data) => {

    await Promise.all(
        data.map((x) => {
            return download(...x)
        })
    )

    let l = []  // 之前失败重试后成功的项目
    successful.forEach((x) => {
        if (failed.delete(x)) {
            l.push(x)
        }
    })

    saveMetaData("uploads_failed.json", failed)
    saveMetaData("uploads_successful.json", successful)

    if (l.length > 0) {
        console.log(l.length + " 项重试成功")
    }

    console.log(successful.size + " 项下载成功")
    console.log(failed.size + " 项下载失败")

}

/**
 * @param {number=} start 
 */
const main = async (start = 0) => {

    /** @type {DataItem[]} */
    const data = fs.readJSONSync(jsonFilePath)

    // 绕过网站的并发限制
    const n = 20
    for (let i = start; i <= data.length; i = i + n) {

        console.log("正在下载：第 " + i + " (含) ~ " + Math.min(i + n, data.length) + " (不含) 项")

        await downloadAll(data.slice(i, i + n))

    }
}

main()
