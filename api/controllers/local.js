
//contrib
var express = require('express');
var router = express.Router();
var passport = require('passport');
var passport_localst = require('passport-local').Strategy;
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var jwt_helper = require('../jwt_helper');
var db = require('../models');

passport.use(new passport_localst(
    function(username, password, done) {
        db.User.findOne({where: {$or: {"username": username, "email": username }}}).then(function(user) {
            //logger.debug("user query result");
            //logger.debug(user);
            if (!user) {
                return done(null, false, { message: 'Incorrect email or username' });
            } else {
                if(!user.password_hash) {
                    //TODO - this should never happen - when user register via 3rd parth account,      
                    //forward user to a first time password reset?
                    return done(null, false, { message: 'Incorrect password (account invalid)' });
                }
                if(!user.isPassword(password)) {
                    //delay returning to defend against password sweeping attack
                    setTimeout(function() {
                        done(null, false, { message: 'Incorrect password' });
                    }, 2000);
                    return;
                }
                done(null, user);
            }
        });
    }
));

router.post('/auth', function(req, res, next) {
    //logger.debug("authentated local user");
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            //incorrect email/user or pass
            return next(info);
        }
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        user.updateTime('local_login');
        user.save().then(function() {
            res.json({message: "Login Success!", jwt: jwt});
        });
    })(req, res, next);
});

//used to setpassword if password_hash is empty or update exiting password (with a valid current password)
router.put('/setpass', jwt({secret: config.auth.public_key}), function(req, res, next) {
    db.User.findOne({where: {id: req.user.sub}}).then(function(user) {
        logger.debug("setting password for sub:"+req.user.sub);
        if(user) {
            if(user.password_hash) {
                if(!user.isPassword(req.body.password_old)) {
                    return setTimeout(function() {
                        next(new Error("Wrong current password"));
                    }, 2000);
                }
            }
            user.setPassword(req.body.password, function(err) {
                if(err) return next(err);
                user.updateTime('password_reset');
                user.save().then(function() {
                    res.json({status: "ok", message: "Password reset successfully."});
                });
            });
        } else {       
            logger.info("failed to find user with sub:"+req.user.sub);
            res.status(404).end();
        }
    });
});

//TODO untested
//reset password (with a valid reset token) ?token=123
router.put('/resetpass', function(req, res, next) {
    var token = req.body.token;
    var password = req.body.password;
    if(!token || !password) return next(new Error("missing parameters"));
    db.User.findOne({where: {password_reset_token: token}}).then(function(user) {
        if(user) {
            user.setPassword(req.body.password, function(err) {
                if(err) return next(err);
                user.password_reset_token = null;
                user.save().then(function() {
                    res.json({status: "ok", message: "Password reset successfully."});
                });
            });
        } else return next(new Error("couldn't find the token provided"));
    });
});

module.exports = router;
