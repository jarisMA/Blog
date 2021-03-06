const {
    login
} = require('../controller/user')
const {
    SuccessModel,
    ErrorModel
} = require('../model/resModel')

const {
    set
} = require('../db/redis')

const handleUserRouter = (req, res) => {
    const method = req.method // GET POST

    // 登录
    if (method === 'POST' && req.path === '/api/user/login') {
        // const {
        //     username,
        //     password
        // } = req.query
        const {
            username,
            password
        } = req.body
        const result = login(username, password)
        return result.then(data => {
            console.log("OUTPUT: handleUserRouter -> data", data)
            if (data.username && data.username === username) {
                // 设置 session
                req.session.username = data.username
                req.session.realname = data.realname
                set(req.sessionId, req.session)
                return new SuccessModel()
            } else {
                return new ErrorModel('登录失败')
            }
        })
    }

    // 登录验证的测试
    if (method === 'GET' && req.path === '/api/user/login-test') {
        console.log(req.session)
        if (req.session.username) {
            return Promise.resolve(new SuccessModel({
                session: req.session
            }))
        } else {
            return Promise.resolve(new ErrorModel('尚未登录'))
        }
    }
}

module.exports = handleUserRouter