// @ts-check
const { URLSearchParams } = require("url")
const { fetch, getProxyAgent } = require("./util")

const agent = getProxyAgent()

/**
 * 上传到 imgur.com
 * @param {string} image 图片地址或图片的base64数据
 * @return {Promise<string>} 图片在 imgur.com 上的地址
 */
const upload = async (image) => {

    const params = new URLSearchParams()
    params.append("image", image)

    const r = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        body: params,
        headers: {
            "Authorization": "Client-ID f0ea04148a54268",
        },
        timeout: 10000,
        agent,
    })

    const json = await r.json()

    if (!json.success) {
        console.error("status:", json.status)
        throw new Error(JSON.stringify(json.data.error))
    }

    return json.data.link

}

module.exports = upload
