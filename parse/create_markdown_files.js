// @ts-check
const fs = require("fs-extra")
const path = require("path")
const yaml = require("js-yaml")
const { JSDOM } = require("jsdom")

const baseFilePath = "../../p/"

/**
 * 获取问题标题
 * @param {Element} questionDiv 
 */
const getQuestionTitle = (questionDiv) => {
    return questionDiv.querySelector("div.post-title > span").textContent.trim()
}

/**
 * 获取问题正文
 * @param {Element} questionDiv 
 */
const getQuestionContent = (questionDiv) => {
    return questionDiv.querySelector("div.post-text-detail").innerHTML.trim()
}

/**
 * 获取问题发布日期
 * @param {Element} questionDiv 
 */
const getQuestionCreatedDate = (questionDiv) => {
    const dateSpan = questionDiv.querySelector("span[itemprop='dateCreated']")
    const date = dateSpan.attributes.getNamedItem("content").value

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
 * 获取问题的赞同数量
 * @param {Element} questionDiv 
 */
const getQuestionUpvoteNumber = (questionDiv) => {
    return +questionDiv.querySelector("span.upvote span.count-wrap").textContent.trim()
}

/**
 * 获取问题的反对数
 * @param {Element} questionDiv 
 */
const getQuestionDownvoteNumber = (questionDiv) => {
    return +questionDiv.querySelector("span.downvote span.count-wrap").textContent.trim()
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
 * 获取问题的评论数
 * @param {Element} questionDiv 
 */
const getQuestionCommentsNumber = (questionDiv) => {
    const commentsSpan = questionDiv.querySelector("span.view-comment")
    return +commentsSpan.attributes.getNamedItem("count").value || 0
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
 * 
 * @param {any} obj 
 */
const createYAMLFrontMatter = (obj) =>{

}

/**
 * 创建备份品葱问题的 Markdown 文件
 * @param {Element} questionDiv 
 */
const createQuestionMarkdownFile = (questionDiv) => {
    const title = getQuestionTitle(questionDiv)
    const date = getQuestionCreatedDate(questionDiv)
    const tags = getQuestionTags(questionDiv)

    const upvote = getQuestionUpvoteNumber(questionDiv)
    const downvote = getQuestionDownvoteNumber(questionDiv)
    const follow = getQuestionFollowersNumber(questionDiv)

    const comments = makeCommentsArray(getQuestionCommentsNumber(questionDiv))

    const content = getQuestionContent(questionDiv)

    // 生成 YAML 头信息
    const yamlFrontMatter =
        "---\n" +
        yaml.safeDump({
            title,
            date,
            tags,
            upvote,
            downvote,
            follow,
            comments,
        }, { indent: 4 })
        + "---\n"

    return yamlFrontMatter + "\n" + content + "\n"
}


/**
 * @param {string} filePath 
 */
const handler = async (filePath) => {
    const html = await fs.readFile(filePath, "utf-8")

    const { window: { document } } = new JSDOM(html)

    const questionDiv = document.querySelector("span[itemtype='http://schema.org/Question'] > div")
    console.log(createQuestionMarkdownFile(questionDiv))

}

const main = async () => {

    await Promise.all(
        fs.readdirSync(baseFilePath)
            .filter((x) => {
                return x.match(/^\d+$/)
            }).sort((a, b) => {
                return +a - +b
            }).map((x) => {
                const filePath = path.join(baseFilePath, x, "index.html")
                return handler(filePath)
            })
    )

}

// main()

handler(path.join(baseFilePath, "248", "index.html"))
