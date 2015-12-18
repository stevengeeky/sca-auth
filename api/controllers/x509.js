
//contrib
var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);

var jwt_helper = require('../jwt_helper');
var db = require('../models');

function finduserByDN(dn, done) {
    db.User.findOne({where: {x509dns: {$like: "%\""+dn+"\"%"}}}).then(function(user) {
        if (!user) return done(null, false, { message: "Couldn't find registered DN:"+dn});
        return done(null, user);
    });
}

/*
function associate(jwt, dn, res) {
    logger.info("associating user with x509 DN "+dn);
    db.User.findOne({where: {id: jwt.sub}}).then(function(user) {
        if(!user) throw new Error("couldn't find user record with jwt.sub:"+jwt.sub);
        var dns = user.get('x509dns');
        if(!~dns.indexOf(dn)) dns.push(dn);
        user.set('x509dns', dns);
        user.save().then(function() {
            res.json({status: "ok", message: "Successfully associated x509D DN:"+dn+" to your account", user: user}); 
        });
    });
}
*/

/*
function register_newuser(dn, uid, res, next) {
    logger.info("registering new user with DN:"+dn);
    db.User.findOne({where: {'username': uid}}).then(function(user) {
        if(user) {
            logger.warn("username already registered:"+uid+"(can't auto register)");
            //TODO - instead of showing this error message, maybe I should redirect user to
            //a page to force user to login via user/pass, then associate the IU CAS IU once user logs in 
            next({message: 
                "This is the first time you login with IU CAS account, "+
                "but we couldn't register this account since the username '"+uid+"' is already registered in our system. "+
                "If you have already registered with username / password, please login with username / password first, "
            });
        } else {
            //brand new user - go ahead and create a new account using IU id as sca user id
            db.User.create({
                username: uid, //let's use IU id as local username
                email: uid+"@iu.edu", 
                email_confirmed: true, //let's trust IU id
                iucas: uid,
                scopes: config.auth.default_scopes
            }).then(function(user) {
                return_jwt(user, dn, res);
            });
        }
    });
}
*/

function return_jwt(user, dn, res) {
    user.updateTime('x509_login:'+dn);
    user.save().then(function() {
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        var need_setpass = (!user.password_hash);
        return res.json({jwt:jwt, need_setpass: need_setpass});
    });
}

var allowCrossDomain = function(req, res, next) {
    console.log("setting header");
    res.header('Access-Control-Allow-Origin', config.x509.allow_origin||'*'); 
    //res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Pragma,Cache-Control,If-Modified-Since,Authorization');
    next();
}
router.use(allowCrossDomain); //for OPTIONS method

//!! this endpoint needs to be exposed via webserver that's requiring x509 DN
router.get('/auth', /*jwt({secret: config.auth.public_key, credentialsRequired: false}),*/ function(req, res, next) {
    //logger.debug(req.user);
    //res.header("Access-Control-Allow-Headers", "X-Requested-With");
    //return res.json({status: "ok", dn: req.headers[config.x509.dn_header], /*headers: req.headers*/});
    var dn = req.headers[config.x509.dn_header];
    if(!dn) {
        console.dir(req.headers);
        return next(new Error("Couldn't find x509 DN (maybe configuration issue?)"));
    }
    finduserByDN(dn, function(err, user, msg) {
        if(err) {
            res.status("500"); //TODO - why don't I send error message back? for security?
            return res.end();
        }
        if(!user) {
            /*
            if(req.user) {
                //If user is already logged in, but DN is associated yet.. then auto-associate.
                //If someone with only local account let someone else login via iucas on the same browser, while the first person is logged in,
                //that someone else can then start using the first person's account after he leaves the computer. However, user intentionally
                //visiting /auth page when the first user is already logged into a system is very unlikely, since the user most likely will
                //sign out so that second user can login. also, if this situation to ever occur, user should be presented with 
                //"we have associated your account" message so that first user should be aware of this happening
                associate(req.user, dn, res);
            } else {
                //TODO - we could auto register if we know user's uid. if the uid already exists, then we need to ask user to associate under account option
                //if the uid doesn't exist, then do register_newuser similar to iucas
                res.status(400).json({message: "Your DN("+dn+") is not yet registered. Please Signup/Signin with your username/password first, then associate your x509 certificate under your account settings."});
                //register_newuser(dn, uid, res, next);
            }
            */
            res.status(400).json({message: "Your DN("+dn+") is not yet registered. Please Signup/Signin with your username/password first, then associate your x509 certificate under your account settings."});
        } else {
            //all good. issue token
            logger.debug("x509 authentication successful with "+dn);
            return_jwt(user, dn, res);
        }
    });
});

//!! this endpoint needs to be exposed via webserver that's requiring x509 DN
router.get('/connect', jwt({secret: config.auth.public_key}), function(req, res, next) {
    var dn = req.headers[config.x509.dn_header];
    if(!dn) {
        console.dir(req.headers);
        return next(new Error("Couldn't find x509 DN (maybe configuration issue?)"));
    }
    finduserByDN(dn, function(err, user, msg) {
        if(err) return res.status("500").end();
        if(!user) {
            //associate(req.user, dn, res);
            logger.info("associating user with x509 DN "+dn);
            db.User.findOne({where: {id: req.user.sub}}).then(function(user) {
                if(!user) throw new Error("couldn't find user record with jwt.sub:"+req.user.sub);
                var dns = user.get('x509dns');
                if(!~dns.indexOf(dn)) dns.push(dn);
                user.set('x509dns', dns);
                user.save().then(function() {
                    res.json({status: "ok", message: "Successfully associated x509D DN:"+dn+" to your account", user: user}); 
                });
            });
        } else {
            if(user.id == req.user.sub) {
                res.status(500).json({status: "failed", message: "The certificate you have provided("+dn+") is already connected to your account."});
            } else { 
                res.status(500).json({status: "failed", message: "The certificate you have provided("+dn+") is already connected to another account."});
                //TODO - does user wish to merge 2 accounts into 1?
            }
        }
    });
});

router.put('/disconnect', jwt({secret: config.auth.public_key}), function(req, res, next) {
    var dn = req.body.dn;
    logger.debug("disconnecting "+dn);
    db.User.findOne({
        where: {id: req.user.sub}
    }).then(function(user) {
        if(!user) res.status(401).end();
        var dns = user.get('x509dns');
        var pos = dns.indexOf(dn);
        if(~pos) dns.splice(pos, 1);
        user.set('x509dns', dns);
        user.save().then(function() {
            res.json({message: "Successfully disconnected X509 DN:"+dn, user: user});
        });    
    });
});

module.exports = router;

