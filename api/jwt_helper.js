
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uuid = require('node-uuid');

var config = require('./config/config').config;
var service_name = "auth";

var jwt_publickey = fs.readFileSync('./config/auth.pub', {encoding: 'ascii'});
var jwt_privatekey = fs.readFileSync('./config/auth.key', {encoding: 'ascii'});

exports.createClaim = function(user) {
    return {
        "iss": config.jwt.iss,
        "exp": (Date.now() + config.jwt.ttl)/1000,
        "iat": (Date.now())/1000,
        "scopes": user.scopes,
        "sub": user._id,

        //this is not part of official jwt, but this allows me to do stateless xsrf check via double-submit
        //"xsrf": uuid.v4()
    }
    //console.log("payload:");
    //console.dir(payload);
}

exports.signJwt = function(claim) {
    //TODO - make this configurable
    return jwt.sign(claim, jwt_privatekey, {algorithm: 'RS256'});
}

//probbably deprecated
exports.setJwtCookies = function(claim, res) {
    var token = exports.signJwt(claim);
    res.cookie('jwt', token, {domain: '.ppa.iu.edu', httpOnly: true, secure: true, path: '/'});
    res.cookie('XSRF-TOKEN', claim.xsrf, {domain: '.ppa.iu.edu', secure: true, path: '/'});
}

/*
exports.setToken = function(token, res) {
    var signed_token = jwt.sign(token, jwt_privatekey, {algorithm: 'RS256'});
    res.cookie('jwt', signed_token, {httpOnly: true, secure: false}); //TODO set secure to true
}
exports.signToken = function(token, res) {
    return jwt.sign(token, jwt_privatekey, {algorithm: 'RS256'});
}
*/

/*
exports.clearToken = function(res) {
    res.clearCookie('jwt');
}
*/

exports.tokenParser = function() {
    return function(req, res, next) {
        if(req.cookies && req.cookies.jwt) {
            var encoded_token = req.cookies.jwt;
            jwt.verify(encoded_token, jwt_publickey, function(err, decoded) {
                if(err) return next(err);
                req.token = decoded;
                if(req.token.xsrf != req.headers["x-xsrf-token"]) {
                    return next(new Error("xsrf token mismatch"));
                }
                console.log("valid jwt/xsrf");
                next();
            });
        } else {
            next(); //no jwt cookie..
        }
    };
}

/* not implemented yet
//use this to check for authorization. if fails, it redirects to /auth
exports.can = function(check_scope) {
    return function(req, res, next) {
        console.log("called usercan for "+req.url);
        console.dir(req.user.scopes);
        if(req.user.scopes) {
            var authorized_scopes = req.token.scopes[service_name];
            if(authorized_scopes) {
                var pass = false;
                authorized_scopes.actions.forEach(function(authorized_scope) {
                    if(authorized_scope == check_scope) pass = true;
                });
                if(pass) return next();
            }
            return res.send(401, 'insufficient authorization: '+check_scope);
        } else {
            console.log("req.token not set - forwarding to auth page");       
            //token not set - probably not yet logged in. redirect to login form.
            //console.log("redirecting user to login form");
            var url = req.protocol + '://' + req.get('host') + req.originalUrl; //TODO - isn't there a better way?
            res.redirect(config.path_prefix+'?redirect='+encodeURIComponent(url));
        }
    }
}
*/
