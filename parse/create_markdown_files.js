// @ts-check
const fs = require("fs-extra")
const path = require("path")
const yaml = require("js-yaml")
const { JSDOM } = require("jsdom")

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
            (
                node.nodeName == "DIV" ||
                node.nodeName == "SPAN"
            ) &&
            (
                node.getAttributeNames().length == 0 ||
                // 元素的属性都为空
                !node.getAttributeNames().some((name) => {
                    return !!node.getAttribute(name)
                })
            )
        )
    },

    /**
     * @param {string} content 
     */
    replacement(content) {
        return content
    }

})

const baseFilePath = "../../p/"
const baseMarkdownFilePath = "../../PincongBackup.github.io/"

/**
 * 获取问题标题
 * @param {Element} questionDiv 
 */
const getQuestionTitle = (questionDiv) => {
    return questionDiv.querySelector("div.post-title > span").textContent.trim()
}

/**
 * 获取问题或回答正文
 * @param {Element} div 
 */
const getContent = (div) => {
    const html = div.querySelector("div.post-text-detail").innerHTML
    const htmlPrettier = html.split("\n").map(x => x.trim()).join("\n")

    const markdown = turndownService.turndown(htmlPrettier)

    return markdown
}

/**
 * 获取发布日期
 * @param {Element} div 
 */
const getCreatedDate = (div) => {
    const dateSpan = div.querySelector("span[itemprop='dateCreated']")
    const date = dateSpan.getAttribute("content")

    // 转换为 UTC 形式，采用 ISO 8601 格式
    return new Date(date).toISOString()
}

/**
 * 获取问题标签
 * @param {Element} questionDiv 
 */
const getQuestionTags = (questionDiv) => {
    const tags = questionDiv.querySelectorAll("div.tags > a.tag")
    return [...tags].map((tag) => {
        return tag.textContent.trim()
    })
}

/**
 * 获取赞同数量
 * @param {Element} div 
 */
const getUpvoteNumber = (div) => {
    return +div.querySelector("span.upvote span.count-wrap").textContent.trim()
}

/**
 * 获取反对数
 * @param {Element} div 
 */
const getDownvoteNumber = (div) => {
    return +div.querySelector("span.downvote span.count-wrap").textContent.trim()
}

/**
 * 获取问题的关注数
 * @param {Element} questionDiv 
 */
const getQuestionFollowersNumber = (questionDiv) => {
    const text = questionDiv.querySelector("div.post-mod-agree").textContent.trim()
    if (text) {
        return +text.match(/(\d+)人关注/)[1]
    } else {
        return 0
    }
}

/**
 * 获取评论数
 * @param {Element} div 
 */
const getCommentsNumber = (div) => {
    const commentsSpan = div.querySelector("span.view-comment")
    return +commentsSpan.getAttribute("count") || 0
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
 * 获取回答者的uid
 * @param {Element} answerDiv 
 */
const getAnswerUserID = (answerDiv) => {
    const userNameSpan = answerDiv.querySelector("span.post-user-name")
    return userNameSpan.getAttribute("uid")
}

/**
 * 获取回答者的用户名
 * @param {Element} answerDiv 
 */
const getAnswerUserName = (answerDiv) => {
    return answerDiv.querySelector("a.aw-user-name").textContent.trim()
}

/**
 * 获取回答者的用户自我介绍
 * @param {Element} answerDiv 
 */
const getAnswerUserIntro = (answerDiv) => {
    /** @type {HTMLSpanElement} */
    const userIntroSpan = answerDiv.querySelector("span.post-user-intro")
    return userIntroSpan.title
}

/**
 * 获取回答者的用户头像
 * @param {Element} answerDiv 
 */
const getAnswerUserAvatar = (answerDiv) => {
    /** @type {HTMLImageElement} */
    const img = answerDiv.querySelector(".post-detail-user-box img")

    // 去掉用户头像的 URL 前缀，例如：https://pin-cong.com
    return img.src.match(/\/static\/upload\/.+/)[0]
}

/**
 * 生成 YAML 头信息
 * @param {any} obj 
 */
const createYAMLFrontMatter = (obj) => {
    const yamlFrontMatter =
        "---\n" +
        yaml.safeDump(obj, { indent: 4 })
        + "---\n"

    return yamlFrontMatter
}

/**
 * 生成备份品葱问题的 Markdown 文件内容
 * @param {Element} questionDiv 
 */
const createQuestionMarkdownFileContent = (questionDiv) => {
    const title = getQuestionTitle(questionDiv)
    const date = getCreatedDate(questionDiv)
    const tags = getQuestionTags(questionDiv)

    const upvote = getUpvoteNumber(questionDiv)
    const downvote = getDownvoteNumber(questionDiv)
    const follow = getQuestionFollowersNumber(questionDiv)

    const comments = makeCommentsArray(getCommentsNumber(questionDiv))

    const content = getContent(questionDiv)

    const yamlFrontMatter =
        createYAMLFrontMatter({
            title,
            date,
            tags,
            upvote,
            downvote,
            follow,
            comments,
        })

    return yamlFrontMatter + "\n" + content + "\n"
}

/**
 * 生成备份品葱回答的 Markdown 文件内容
 * @param {Element} answerDiv 
 */
const createAnswerMarkdownFileContent = (answerDiv) => {
    const date = getCreatedDate(answerDiv)

    const user_id = +getAnswerUserID(answerDiv)
    const user_name = getAnswerUserName(answerDiv)
    const user_intro = getAnswerUserIntro(answerDiv)
    const user_avatar = getAnswerUserAvatar(answerDiv)

    const upvote = getUpvoteNumber(answerDiv)
    const downvote = getDownvoteNumber(answerDiv)

    const comments = makeCommentsArray(getCommentsNumber(answerDiv))

    const content = getContent(answerDiv)

    const yamlFrontMatter =
        createYAMLFrontMatter({
            date,
            user_id,
            user_name,
            user_intro,
            user_avatar,
            upvote,
            downvote,
            comments,
        })

    return yamlFrontMatter + "\n" + content + "\n"
}

/**
 * @param {string} questionPostID
 */
const handler = async (questionPostID) => {

    const filePath = path.join(baseFilePath, questionPostID, "index.html")

    const html = await fs.readFile(filePath, "utf-8")

    const { window: { document } } = new JSDOM(html)

    /**
     * 创建备份提问的 Markdown 文件
     */

    /** @type {HTMLDivElement} */
    const questionDiv = document.querySelector("span[itemtype='http://schema.org/Question'] > div.post-body")

    console.log("postID:", questionPostID)

    try {
        const questionMDFPath = path.join(baseMarkdownFilePath, "_p", questionPostID + ".md")
        const questionMDFContent = createQuestionMarkdownFileContent(questionDiv)

        await fs.writeFile(questionMDFPath, questionMDFContent)

        /**
         * 创建备份回答的 Markdown 文件
         */

        /** @type {NodeListOf<HTMLDivElement>} */
        const answerDivList = document.querySelectorAll("div.post-answer-wrap > div.post-body-wrap")

        answerDivList.forEach((answerDiv) => {
            const answerPostID = answerDiv.dataset.mainpost

            const answerMDFPath = path.join(baseMarkdownFilePath, "_answers", questionPostID, answerPostID + ".md")
            const answerMDFContent = createAnswerMarkdownFileContent(answerDiv)

            fs.ensureDirSync(path.parse(answerMDFPath).dir)

            fs.writeFile(answerMDFPath, answerMDFContent)
        })
    } catch (e) {
        console.error(e)
    }

}

const main = async () => {

    await Promise.all(
        fs.readdirSync(baseFilePath)
            .filter((x) => {
                return x.match(/^\d+$/)
            }).sort((a, b) => {
                return +a - +b
            }).map((x) => {
                return handler(x)
            })
    )

}

main()
