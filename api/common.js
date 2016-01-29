
//node
var fs = require('fs');

//contrib
var jwt = require('jsonwebtoken');
var uuid = require('node-uuid');
var nodemailer = require('nodemailer');
var uuid = require('node-uuid');

//mine
var config = require('./config');

//var service_name = "auth";
//var jwt_publickey = fs.readFileSync('./config/auth.pub', {encoding: 'ascii'});
//var jwt_privatekey = fs.readFileSync('./config/auth.key', {encoding: 'ascii'});

exports.createClaim = function(user) {
    var ids = {
        username: user.username,
        email: user.email,
    };

    /* http://websec.io/2014/08/04/Securing-Requests-with-JWT.html
    iss: The issuer of the token
    aud: The audience that the JWT is intended for
    iat: The timestamp when the JWT was created
    nbf: A "not process before" timestamp defining an allowed start time for processing
    exp: A timestamp defining an expiration time (end time) for the token
    jti: Some kind of unique ID for the token
    typ: A "type" of token. In this case it's URL but it could be a media type like these
    */

    return {
        "iss": config.auth.iss,
        "exp": (Date.now() + config.auth.ttl)/1000,
        "iat": (Date.now())/1000,
        "scopes": user.scopes,
        "sub": String(user.id), //can't use user.username because it might not used. convert to string for better compatibility

        //this is not part of official jwt, but this allows me to do stateless xsrf check via double-submit
        //"xsrf": uuid.v4()

        //this is really tempting.. but if I allows this, how about other ids (casid, googleid, etc..?)
        //"userid": user.username, 
    }
    //console.log("payload:");
    //console.dir(payload);
}

exports.signJwt = function(claim) {
    return jwt.sign(claim, config.auth.private_key, config.auth.sign_opt);
}

function do_send_email_confirmation(url, user, cb) {
    var fullurl = url+"#/confirm_email?t="+user.email_confirmation_token+"&sub="+user.id;

    var transporter = nodemailer.createTransport(); //use direct mx transport
    transporter.sendMail({
        from: config.email_confirmation.from,
        to: user.email,
        subject: config.email_confirmation.subject,
        text: "Hello!\n\nIf you has created a new SCA account, please visit following URL to confirm your email address.\n\n"+ fullurl,
        //html:  ejs.render(html_template, params),
    }, function(err, info) {
        if(err) return cb(err);
        if(info && info.response) logger.info("notification sent: "+info.response);
        cb();
    });
}

exports.send_email_confirmation = function(url, user, cb) {
    
    //need to generate token if it's not set yet
    if(!user.email_confirmation_token) {
        user.email_confirmation_token = uuid.v4();
        user.save().then(function() {
            do_send_email_confirmation(url, user, cb);
        });
    } else {
        do_send_email_confirmation(url, user, cb);
    }
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

/* handle jwt sent via cookie
exports.tokenParser = function() {
    return function(req, res, next) {
        if(req.cookies && req.cookies.jwt) {
            var encoded_token = req.cookies.jwt;
            jwt.verify(encoded_token, config.public_key, function(err, decoded) {
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
*/

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
