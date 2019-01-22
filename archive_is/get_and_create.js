// @ts-check

const fs = require("fs-extra")
const path = require("path")
const yaml = require("js-yaml")
const { JSDOM } = require("jsdom")
const { fetch, getProxyAgent } = require("../util")

const getCreatedDate = require("./get_created_date.js")

const TurndownService = require("turndown")
const turndownService = new TurndownService({
    hr: "---",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    defaultReplacement(innerHTML, node) {  // 处理 Markdown 不支持的元素，输出其 outerHTML
        return node.isBlock ? "\n\n" + node.outerHTML + "\n\n" : node.outerHTML
    },
})

turndownService.addRule("div_span", {

    /**
     * @param {Element} node 
     */
    filter(node) {
        return (
            node.nodeName == "DIV" ||
            node.nodeName == "SPAN"
        )
    },

    /**
     * @param {string} content 
     */
    replacement(content) {
        return content
    }

})

turndownService.addRule("repair_link", {

    /**
     * @param {Element} node 
     */
    filter(node) {
        return (
            node.nodeName == "A" &&
            node.getAttribute("href")
        )
    },

    /**
     * @param {string} content 
     * @param {Element} node 
     */
    replacement(content, node) {
        const href = node.getAttribute("href").replace(/^http(?:s)?:\/\/(?:.+)(http(s)?:\/\/)/, "$1")
        return `[${content}](${href})`
    }

})

const agent = getProxyAgent()
const jsonFilePath = "./urls.json"
const baseMarkdownFilePath = "../../PincongBackup.github.io/"
const usersFilePath = "../../PincongBackup.github.io/_site/data/users.json"

/** 
 * @typedef {{ user_id?: number; user_name: string; user_intro?: string; user_avatar?: string; }} UserInfo 
 */

/** @type {{ user_id: string; user_name: string; user_intro: string; user_avatar: string; answers: Object[]; }[]} */
const usersData = fs.readJSONSync(usersFilePath)
const usersDataMap = new Map(
    usersData.map((user) => {

        const { user_id, user_name, user_intro, user_avatar } = user

        /** @type {[string, UserInfo]} */
        const a = [
            user_name,
            {
                user_id: +user_id,
                user_name,
                user_intro,
                user_avatar
            }
        ]

        return a
    })
)

/**
 * 生成 YAML 头信息
 * @param {any} obj 
 */
const createYAMLFrontMatter = (obj) => {
    // 去除 undefined
    obj = JSON.parse(JSON.stringify(obj))

    const yamlFrontMatter =
        "---\n" +
        yaml.safeDump(obj, { indent: 4 })
        + "---\n"

    return yamlFrontMatter
}

/**
 * 由评论数构造内容为空的评论数组
 * @param {number} commentsNumber 
 * @returns {string[]}
 */
const makeCommentsArray = (commentsNumber) => {
    return new Array(commentsNumber).fill("")
}


/**
 * 获取问题或专栏文章的标签
 * @param {Element} tagsDiv
 * @returns {string[]}
 */
const getTags = (tagsDiv) => {
    const tagAList = tagsDiv.querySelectorAll("a")

    return [...tagAList].map((tagA) => {
        return tagA.text.trim()
    })
}

/**
 * 获取正文
 * @param {Element} contentDiv 
 */
const getContent = (contentDiv) => {
    const html = contentDiv.innerHTML
    const htmlPrettier = html.split("\n").map(x => x.trim()).join("\n")

    const markdown = turndownService.turndown(htmlPrettier)

    return markdown
}

/**
 * 获取回答者的用户信息
 * @param {Element} userDiv 
 * @returns {UserInfo}
 */
const getAnswerUserInfo = (userDiv) => {
    const userName = userDiv.children[0].querySelector("a").text.trim()

    const result = usersDataMap.get(userName)

    if (result) {
        return result
    } else {
        const userIntroSpan = userDiv.children[0].children[1]
        const userIntro = userIntroSpan.getAttribute("title")
        return {
            user_name: userName,
            user_intro: userIntro && userIntro.trim()
        }
    }
}

/**
 * 获取专栏文章作者的用户信息
 * @param {Element} userDiv 
 * @returns {UserInfo}
 */
const getArticleUserInfo = (userDiv) => {
    const userName = userDiv.textContent.trim()

    const result = usersDataMap.get(userName)

    return result || { user_name: userName }
}


/**
 * 生成备份品葱问题的 Markdown 文件内容
 * @param {Element} questionDiv 
 */
const createQuestionMarkdownFileContent = async (questionDiv) => {

    const [tagsDiv, titleDiv, , questionBodyTopDiv] = questionDiv.children
    const [questionPostIdA, questionBodyDiv] = questionBodyTopDiv.children
    const [questionFollowersDiv, questionContentTopDiv, , questionCommentsDiv] = questionBodyDiv.children
    const questionContentDiv = questionContentTopDiv.children[0].children[0]

    const tags = getTags(tagsDiv)
    const title = titleDiv.textContent.trim()
    const questionPostId = questionPostIdA.getAttribute("name")
    const [, upvote, follow] = questionFollowersDiv.textContent.trim().match(/(\d+)人赞同 (\d+)人关注/)

    const commentsNumber = +questionCommentsDiv.textContent.match(/(\d+)\s+条评论/)[1] || 0
    const comments = makeCommentsArray(commentsNumber)

    const content = getContent(questionContentDiv)

    const date = (await getCreatedDate(+questionPostId)).toISOString()

    const yamlFrontMatter =
        createYAMLFrontMatter({
            title,
            date,
            tags,
            upvote: +upvote,
            downvote: 0,
            follow: +follow,
            comments,
        })

    return {
        postId: questionPostId,
        markdownFileContent: yamlFrontMatter + "\n" + content + "\n"
    }

}

/**
 * 生成备份品葱回答的 Markdown 文件内容
 * @param {Element} answerDiv 
 */
const createAnswerMarkdownFileContent = async (answerDiv) => {

    const [answerPostIdA, answerBodyDiv] = answerDiv.children[0].children[1].children
    const [userDiv, upvotersDiv, answerContentTopDiv, , answerCommentsDiv] = answerBodyDiv.children
    const answerContentDiv = answerContentTopDiv.children[0].children[0]

    const postId = answerPostIdA.getAttribute("name")

    const date = (await getCreatedDate(+postId)).toISOString()

    const { user_id, user_name, user_intro, user_avatar } = getAnswerUserInfo(userDiv)

    const upvote = +upvotersDiv.textContent.trim().match(/(\d+)人赞同/)[1]

    const commentsNumber = +answerCommentsDiv.textContent.match(/(\d+)\s+条评论/)[1] || 0
    const comments = makeCommentsArray(commentsNumber)

    const content = getContent(answerContentDiv)

    const yamlFrontMatter =
        createYAMLFrontMatter({
            date,
            user_id,
            user_name,
            user_intro,
            user_avatar,
            upvote: +upvote,
            downvote: 0,
            comments,
        })

    return {
        postId: postId,
        markdownFileContent: yamlFrontMatter + "\n" + content + "\n"
    }

}

/**
 * 生成备份专栏文章的 Markdown 文件内容
 * @param {Element} articleDiv 
 */
const createArticleMarkdownFileContent = async (articleDiv) => {

    const [tagsDiv, , titleDiv, userDiv, bodyTopDiv] = articleDiv.children
    const [postIdA, bodyDiv] = bodyTopDiv.children
    const [upvotersDiv, contentTopDiv, , commentsDiv] = bodyDiv.children
    const contentDiv = contentTopDiv.children[0].children[0]

    const postId = postIdA.getAttribute("name")
    const date = (await getCreatedDate(+postId)).toISOString()

    const tags = getTags(tagsDiv)
    const title = titleDiv.textContent.trim()

    const { user_id, user_name, user_avatar } = getArticleUserInfo(userDiv)

    const upvote = +upvotersDiv.textContent.trim().match(/(\d+)人赞过/)[1]
    
    const commentsNumber = +commentsDiv.textContent.match(/(\d+)\s+条评论/)[1] || 0
    const comments = makeCommentsArray(commentsNumber)

    const content = getContent(contentDiv)

    const yamlFrontMatter =
        createYAMLFrontMatter({
            title,
            date,
            user_id,
            user_name,
            user_avatar,
            tags,
            upvote,
            downvote: 0,
            comments,
        })

    return {
        postId: postId,
        markdownFileContent: yamlFrontMatter + "\n" + content + "\n"
    }

}

/**
 * @param {string} url 
 */
const get = async (url) => {

    try {
        const r = await fetch(url, {
            timeout: 10000,
            agent,  // 如果不需要使用梯子请注释这一行
        })
        if (r.ok) {

            const html = await r.textConverted()
            const { window: { document } } = new JSDOM(html)

            const bodyDiv = document.querySelector(".body > div:nth-child(2) > div:nth-child(4) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1)")

            const postTypeH3 = bodyDiv.children[0].children[0].children[0]
            const isArticle = postTypeH3.nodeName == "H3" && !!postTypeH3.textContent.trim().match(/^专栏文章/m)

            const questionOrArticleDiv = Array.prototype.slice.call(bodyDiv.children[0].children, -1)[0]

            let mainPostId = ""
            if (isArticle) {
                const { postId: articlePostID, markdownFileContent: articleMDFContent } = await createArticleMarkdownFileContent(questionOrArticleDiv)
                const articleMDFPath = path.join(baseMarkdownFilePath, "_articles", articlePostID + ".md")
                await fs.writeFile(articleMDFPath, articleMDFContent)
                mainPostId = articlePostID
            } else {
                const { postId: questionPostID, markdownFileContent: questionMDFContent } = await createQuestionMarkdownFileContent(questionOrArticleDiv)
                const questionMDFPath = path.join(baseMarkdownFilePath, "_p", questionPostID + ".md")
                await fs.writeFile(questionMDFPath, questionMDFContent)
                mainPostId = questionPostID
            }

            const answersDiv = bodyDiv.children[1]
            const answerDivList = [...answersDiv.children].slice(0, -1)

            answerDivList.forEach(async (answerDiv) => {
                const { postId: answerPostID, markdownFileContent: answerMDFContent } = await createAnswerMarkdownFileContent(answerDiv)

                const answerMDFPath = path.join(baseMarkdownFilePath, "_answers", mainPostId, answerPostID + ".md")

                fs.ensureDirSync(path.parse(answerMDFPath).dir)

                fs.writeFile(answerMDFPath, answerMDFContent)
            })

        } else {
            console.error(url + " " + r.status + " " + r.statusText)
            return
        }
    } catch (e) {
        console.error(url + " " + e)
        // console.error(url)
        // console.error(e)
        return
    }

}

/**
 * @param {number=} n 
 */
const main = async (n = 2) => {

    // console.log(JSON.stringify([...document.querySelectorAll(".TEXT-BLOCK > a:nth-child(1)")].map(x=>x.href)))
    /** @type {string[]} */
    let urls = await fs.readJSON(jsonFilePath)

    // 绕过网站的并发限制
    for (let i = 0; i <= urls.length; i = i + n) {

        await Promise.all(
            urls.slice(i, i + n).map((url) => {
                return get(url)
            })
        )

    }

}

main()
