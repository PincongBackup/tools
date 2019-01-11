// @ts-check
// 生成随机hash
const crypto = require("crypto")

const buffer = crypto.randomBytes(40)

const hash = crypto.createHash("sha256")
hash.update(buffer)

console.log(hash.digest("hex"))

