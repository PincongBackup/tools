// @ts-check

/*!
 * 整理品葱搬运工的搬运列表，输出json格式
 * 官方列表：https://telegra.ph/品葱搬运工-08-07
 * json格式列表(本项目)：https://github.com/PincongBackup/pincongessence/blob/master/list.json
 * 目前已收集到第1023条 (2019年1月18日)
 * 欢迎感兴趣的小伙伴合作参与这个项目
 */

const fs = require("fs-extra")
const { JSDOM } = require("jsdom")
const { fetch, getProxyAgent } = require("../util")

const agent = getProxyAgent()
const jsonFilePath = "../../pincongessence/list.json"

const baseURL = "https://t.me/pincongessence/{id}?embed=1"

/**
 * @typedef {Object} ListItem
 * @property {string} link
 * @property {string} title
 * @property {string} description
 * @property {string} messageLink
 */

/**
 * @param {number} start
 * @param {number} end
 */
const range = (start, end) => {
    return new Array(end - start + 1).fill(null).map((_, index) => index + start)
}

/**
 * @param {number} id 
 */
const get = async (id) => {
    const url = baseURL.replace("{id}", String(id))

    try {
        const r = await fetch(url, {
            timeout: 10000,
            agent,  // 如果不需要使用梯子请注释这一行
        })
        if (r.ok) {

            const html = await r.textConverted()
            const { window: { document } } = new JSDOM(html)

            /** @type {HTMLAnchorElement} */
            const linkA = document.querySelector(".tgme_widget_message_text > a")
            const link = decodeURI(linkA.href)

            /** @type {HTMLDivElement} */
            const titleDiv = document.querySelector(".link_preview_title")
            const title = titleDiv.textContent.trim()

            /** @type {HTMLDivElement} */
            const descriptionDiv = document.querySelector(".link_preview_description")
            const description = descriptionDiv.textContent.trim()

            /** @type {HTMLAnchorElement} */
            const messageLinkA = document.querySelector(".tgme_widget_message_link > a")
            const messageLink = messageLinkA.href

            return {
                link,
                title,
                description,
                messageLink,
            }

        } else {
            console.error(url + " " + r.status + " " + r.statusText)
            return
        }
    } catch (e) {
        console.error(url + " " + e)
        return
    }

}

/**
 * @param {number=} start 
 * @param {number=} end 
 * @param {number=} n 
 */
const main = async (start = 1, end = 1200, n = 20) => {

    /** @type {ListItem[]} */
    let savedData = fs.existsSync(jsonFilePath) ? await fs.readJSON(jsonFilePath) : []

    if (savedData.length > 0) {
        savedData = savedData.sort()
    }

    // 绕过网站的并发限制
    for (let i = start; i <= end; i = i + n) {

        const idList = range(i, Math.min(i + n - 1, end))

        /** @type {ListItem[]} */
        // @ts-ignore
        const data = (await Promise.all(
            idList.map((id) => {
                return get(id)
            })
        )).filter(x => !!x)

        savedData.push(...data)

        // 排序
        savedData = savedData.sort((a, b) => {
            const messageIdA = +a.messageLink.match(/\/(\d+)/)[1]
            const messageIdB = +b.messageLink.match(/\/(\d+)/)[1]

            return messageIdA - messageIdB
        })

        // 去重
        savedData = savedData.reduce((p, c, index, array) => {
            if (array[index - 1] && array[index - 1].messageLink == c.messageLink) {
                return p
            } else {
                return p.concat(c)
            }
        }, [])

        await fs.writeJSON(jsonFilePath, savedData, { spaces: 4 })

    }

}

main(3)
