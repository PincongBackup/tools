// @ts-check
// 搜索结果去重
const fs = require("fs-extra")

const cachedPages = fs.readJSONSync("./cached_pages.json")

console.log(cachedPages.length)

let cachedPagesUniq = []
let p

cachedPages.sort((a, b) => {
    return +a.postID - +b.postID
}).forEach((x) => {
    if (p && p.postID == x.postID) {
        console.log(x)
    } else {
        p = x
        cachedPagesUniq.push(x)
    }
})

console.log(cachedPagesUniq.length)

fs.writeJSONSync("./cached_pages.json", cachedPagesUniq, { spaces: 4 })
