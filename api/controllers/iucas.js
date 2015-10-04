
//contrib
var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);

var jwt_helper = require('../jwt_helper');
var db = require('../models');

function finduserByiucasid(id, done) {
    db.User.findOne({where: {"iucas": id}}).then(function(user) {
        //console.dir(user);
        if (!user) {
            return done(null, false, { message: "Couldn't find registered IU CAS ID:"+id });
        }
        return done(null, user);
    });
}

function associate(jwt, uid, res) {
    logger.info("associating user with iucas id:"+uid);
    db.User.findOne({where: {id: jwt.sub}}).then(function(user) {
        if(!user) throw new Error("couldn't find user record with jwt.sub:"+uid);
        user.iucas = uid;
        user.save().then(function() {
            var messages = [{type: "success", /*title: "IUCAS ID Associated",*/ message: "We have associated IU ID:"+uid+" to your account"}];
            res.cookie('messages', JSON.stringify(messages), {path: '/'});
            return res.json({status: "ok"}); //probably ignored.. but
            //return res.redirect(config.iucas.home_url+'#/settings');
        });
    });
}

function register_newuser(uid, res) {
    logger.info("registering new user with iucas id:"+uid);
    db.User.findOne({where: {'username': uid}}).then(function(user) {
        //if(err) return next(err);
        if(user) {
            logger.warn("username already registered:"+uid+"(can't auto register)");
            //why am I passing this message via errors.html?
            //because in order to login via IU CAS, I had to make browser jump to IU CAS page and back 
            //TODO - instead of showing this error message, maybe I should redirect user to
            //a page to force user to login via user/pass, then associate the IU CAS IU 
            //once user logs in 
            var messages = [{type: "error", title: "Registration Failed", message: "This is the first time you login with IU CAS account, "+
                "but we couldn't register this account since the username '"+uid+"' is already registered in our system. "+
                "If you have already registered with username / password, please login with username / password first, "+
                "then associate your IU CAS account under your account settings."}];
            res.cookie('messages', JSON.stringify(messages), {path: '/'});
            return res.redirect(config.iucas.home_url);
        } else {
            //brand new user - go ahead and create a new account using IU id as sca user id
            db.User.create({
                username: uid, //let's use IU id as local username
                email: uid+"@iu.edu", 
                email_confirmed: true, //let's trust IU id
                iucas: uid,
                scopes: config.auth.default_scopes
            }).then(function(user) {
                return_jwt(user, res);
            });
        }
    });
}

function return_jwt(user, res) {
    user.updateTime('iucas_login');
    user.save().then(function() {
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        var need_setpass = (!user.password_hash);
        return res.json({jwt:jwt, need_setpass: need_setpass});
    });
}

router.get('/verify', jwt({secret: config.auth.public_key, credentialsRequired: false}), function(req, res, next) {
    var ticket = req.query.casticket;
    var casurl = config.iucas.home_url;
    
    //logger.debug("validating cas ticket:"+ticket+" casurl:"+casurl);
    request('https://cas.iu.edu/cas/validate?cassvc=IU&casticket='+ticket+'&casurl='+casurl, function (err, response, body) {
        if(err) return next(err);
        if (response.statusCode == 200) {
            var reslines = body.split("\n");
            if(reslines[0].trim() == "yes") {
                var uid = reslines[1].trim();
                finduserByiucasid(uid, function(err, user, msg) {
                    if(err) {
                        res.status("500"); //TODO - why don't I send error message back? for security?
                        return res.end();
                    }
                    if(!user) {
                        if(req.user) {
                            //If user is already logged in, but no iucas associated yet.. then auto-associate.
                            //If someone with only local account let someone else login via iucas on the same browser, while the first person is logged in,
                            //that someone else can then start using the first person's account after he leaves the computer. However, user intentionally
                            //visiting /auth page when the first user is already logged into a system is very unlikely, since the user most likely will
                            //sign out so that second user can login. also, if this situation to ever occur, user should be presented with 
                            //"we have associated your account" message so that first user should be aware of this happening
                            associate(req.user, uid, res);
                        } else {
                            register_newuser(uid, res);
                        }
                    } else {
                        //all good. issue token
                        logger.debug("iucas authentication successful. iu id:"+uid);
                        return_jwt(user, res);
                    }
                });
            } else {
                logger.error("IUCAS failed to validate");
                res.sendStatus("403");//Is 403:Forbidden appropriate return code?
            }
        } else {
            //non 200 code...
            next(new Error(body));
        }
    })
});

router.put('/disconnect', jwt({secret: config.auth.public_key}), function(req, res, next) {
    db.User.findOne({
        where: {id: req.user.sub}
    }).then(function(user) {
        if(!user) res.status(401).end();
        user.iucas = null;
        user.save().then(function() {
            res.json({message: "Successfully disconnected IUCAS account."});
        });    
    });
});

module.exports = router;
