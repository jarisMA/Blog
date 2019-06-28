const querystring = require('querystring')

const handleBlogRouter = require('./src/router/blog')
const handleUserRouter = require('./src/router/user')

const {
    set,
    get
} = require('./src/db/redis')

// 获取 cookie 的过期时间
const getCookieExpires = () => {
    const d = new Date()
    d.setTime(d.getTime() + (24 * 60 * 60 * 1000))
    console.log("OUTPUT: getCookieExpires -> d.toGMTString()", d.toGMTString())
    return d.toGMTString()
}

// session 数据
const SESSION_DATA = {}

// 用于处理 post data
const getPostData = (req) => {
    const promise = new Promise((resolve, reject) => {
        if (req.method !== 'POST') {
            resolve({})
            return
        }
        if (req.headers['content-type'] !== 'application/json') {
            resolve({})
            return
        }
        let postData = ''
        req.on('data', chunk => {
            postData += chunk.toString()
        })
        req.on('end', () => {
            if (!postData) {
                resolve({})
                return
            }

            resolve(
                JSON.parse(postData)
            )
        })
    })
    return promise
}

const serverHandle = (req, res) => {
    // 设置返回格式 JSON
    res.setHeader('Content-type', 'application/json')

    // 获取 path
    const url = req.url
    req.path = url.split('?')[0]

    // 解析 query
    req.query = querystring.parse(url.split('?')[1])

    // 解析 cookie
    req.cookie = {}
    const cookieStr = req.headers.cookie || ''
    cookieStr.split(';').forEach(item => {
        if (!item) {
            return
        }
        const arr = item.split('=')
        const key = arr[0].trim()
        const value = arr[1].trim()
        console.log(key, value)
        req.cookie[key] = value
    })
    console.log("OUTPUT: serverHandle -> req.cookie", req.cookie)

    // 解析 session
    let needSetCookie = false
    let userid = req.cookie.userid
    if (userid) {
        // if (!SESSION_DATA[userid]) {
        //     SESSION_DATA[userid] = {}
        // }
        let res = get(userid)
        res.then(val => {
            if (!val) {
                set(userid, {})
                req.session = {}
            } else {
                req.session = val
            }
            handlePostData()
        })
    } else {
        needSetCookie = true
        userid = `${Date.now()}_${Math.random()}`
        set(userid, {})
        req.session = {}
        handlePostData()
    }
    // req.session = SESSION_DATA[userid]
    req.sessionId = userid
        // 处理 post data
    function handlePostData() {
        getPostData(req).then(postData => {
            req.body = postData

            // 处理 blog 路由
            // const blogData = handleBlogRouter(req, res)
            // if (blogData) {
            //     res.end(
            //         JSON.stringify(blogData)
            //     )
            //     return
            // }
            const blogResult = handleBlogRouter(req, res)
            if (blogResult) {
                blogResult.then(blogData => {
                    if (needSetCookie) {
                        res.setHeader('Set-Cookie', `userid=${userid}; path=/; httpOnly; expires=${getCookieExpires()}`)
                    }
                    res.end(
                        JSON.stringify(blogData)
                    )
                })
                return
            }

            // 处理 user 路由
            // const userData = handleUserRouter(req, res)
            // if (userData) {
            //     res.end(
            //         JSON.stringify(userData)
            //     )
            //     return
            // }
            const userResult = handleUserRouter(req, res)
            if (userResult) {
                userResult.then(userData => {
                    if (needSetCookie) {
                        res.setHeader('Set-Cookie', `userid=${userid}; path=/; httpOnly; expires=${getCookieExpires()}`)
                    }
                    res.end(
                        JSON.stringify(userData)
                    )
                })
                return
            }

            // 未命中路由，返回 404
            res.writeHead(404, {
                "Content-type": "text/plain"
            })
            res.write("404 Not Found\n")
            res.end()
        })
    }
}

module.exports = serverHandle