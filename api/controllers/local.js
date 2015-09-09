
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

var User = require('../models').User;

passport.use(new passport_localst(
    function(username, password, done) {
        User.findOne({where: {$or: {"username": username, "email": username }}}).then(function(user) {
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
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            //incorrect email/user or pass
            return next(info);
        }
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        return res.json({message: "Login Success!", jwt: jwt});
    })(req, res, next);
});

//returns things that user might want to know about himself.
router.get('/me', jwt({secret: config.auth.public_key}), function(req, res) {
    User.findOne({where: {id: req.user.sub}}).then(function(user) {
        if(user) {
            res.json({
                username: user.username,
                email: user.email
            });
        } else res.status(404).end();
    });
});

//used to setpassword (if password_hash is empty)
//or update password (with a valid current password)
router.put('/setpass', jwt({secret: config.auth.public_key}), function(req, res) {
    User.findOne({where: {id: req.user.sub}}).then(function(user) {
        if(user) {
            if(user.password_hash) throw new Error("password is already set. please use /resetpass instead");
            user.setPassword(req.body.password, function(err) {
                if(err) throw err;
                user.save(function() {
                    res.json({status: "ok", message: "Password reset successfully."});
                });
            });
        } else res.status(404).end();
    });
});

//TODO untested
//reset password (with a valid reset token) ?token=123
router.put('/resetpass', function(req, res) {
    var token = req.body.token;
    var password = req.body.password;
    if(!token || !password) throw new Error("missing parameters");
    User.findOne({where: {password_reset_token: token}}).then(function(user) {
        if(user) {
            user.setPassword(req.body.password, function(err) {
                if(err) throw err;
                user.password_reset_token = null;
                user.save(function() {
                    res.json({status: "ok", message: "Password reset successfully."});
                });
            });
        } else throw new Error("couldn't find the token provided");
    });
});

module.exports = router;
