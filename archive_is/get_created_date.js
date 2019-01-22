// @ts-check
const fs = require("fs-extra")
const yaml = require("js-yaml")
const path = require("path")

const baseFilePath = "../../PincongBackup.github.io/"
const subPaths = ["_answers"]

const allPostFiles = subPaths.map((subPath) => {
    const p = path.join(baseFilePath, subPath)

    /** @type {string[]} */
    const files = fs.readdirSync(p)
        .map((f) => {
            const p1 = path.join(p, f)
            if (fs.statSync(p1).isDirectory()) {
                return fs.readdirSync(p1).map(x => path.join(p1, x))
            } else {
                return p1
            }
        }).reduce((p, c) => {
            if (typeof c == "string") {
                return p.concat(c)
            } else {
                return p.concat(...c)
            }
        }, [])

    return files
}).reduce((p, c) => {
    return p.concat(...c)
}, [])

const allPostFilesMap = new Map(
    allPostFiles.map(
        /** @returns {[number, string]} */
        (file) => {
            const postId = +file.match(/(\d+).md/)[1]
            return [postId, file]
        }
    )
)

/**
 * @param {number[]} array 
 */
const sort = (array) => {
    return array.sort((a, b) => a - b)
}

/**
 * @param {number} postId 
 */
const readCreatedDate = async (postId) => {
    const filePath = allPostFilesMap.get(postId)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const yamlHeaders = fileContent.split(/---(?:\n|\r\n)/)[1]
    const obj = yaml.safeLoad(yamlHeaders)
    return new Date(obj.date)
}

/**
 * @param {number} postId 
 */
const getCreatedDate = async (postId) => {

    const allPostIdList = sort([...allPostFilesMap.keys()])

    if (allPostIdList.includes(postId)) {

        return await readCreatedDate(postId)

    } else {

        allPostIdList.push(postId)

        const newList = sort(allPostIdList)

        const index = newList.indexOf(postId)

        const previous = newList[index - 1]
        const next = newList[index + 2]

        const previousTime = (await readCreatedDate(previous)).valueOf()
        const nextTime = (await readCreatedDate(next)).valueOf()

        const average = (previousTime + nextTime) / 2

        return new Date(average)

    }

}

module.exports = getCreatedDate
