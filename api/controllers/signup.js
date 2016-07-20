
//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var clone = require('clone');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var common = require('../common');

function registerUser(body, done) {
    var u = clone(config.auth.default);
    u.username = body.username;
    u.fullname = body.fullname;
    u.email = body.email;
    var user = db.User.build(u);
    logger.info("registering user");
    logger.info(user);
    user.setPassword(body.password, function(err) {
        if(err) return done(err);
        logger.debug("set password done");
        user.save().then(done);
    });
}

/**
 * @api {post} /signup Register new user
 * @apiName Signup
 * @apiDescription Register new user with username and email
 * @apiGroup Local
 *
 * @apiParam {String} username Username
 * @apiParam {String} password Password
 * @apiParam {String} email Email
 *
 */
router.post('/', function(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;

    //TODO - validate password strength? (req.body.password)
    //check for username already taken
    db.User.findOne({where: {username: username} }).then(function(user) {
        if(user) {
            //TODO - maybe I should go ahead and forward user to login form?
            return next('The username you chose is already registered. If it is yours, please try signing in, or register with a different username.');
        } else {
            //check for email already taken
            db.User.findOne({where: {email: email} }).then(function(user) {
                if(user) {
                    //TODO - maybe I should go ahead and forward user to login form?
                    return next('The email address you chose is already registered. If it is yours, please try signing in, or register with a different email address.');
                } else {
                    registerUser(req.body, function(user) {
                        common.createClaim(user, function(err, claim) {
                            if(err) return next(err);
                            var jwt = common.signJwt(claim);
                            if(config.email_confirmation) {
                                common.send_email_confirmation(req.headers.referer||config.email_confirmation.url, user, function(err) {
                                    if(err) return next(err);
                                    res.json({code:'confirm_email', jwt: jwt, sub: user.id});
                                });
                            } else {
                                res.json({jwt: jwt, sub: user.id});
                            }
                        });
                    });        
                }
            });
        }
    });
})

module.exports = router;

