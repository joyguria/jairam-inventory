var {expressjwt:jwt} = require('express-jwt');
function authJwt(){
    const secret = process.env.JSON_WEB_TOKEN_SECRETE_KET;
    return jwt({
        secret:secret,
        algorithms:["HS256"]
    })
}
module.exports = authJwt