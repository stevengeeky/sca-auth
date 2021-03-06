
//contrib
const express = require('express');
const router = express.Router();
const winston = require('winston');
const clone = require('clone');
const async = require('async');
const jwt = require('express-jwt');

//mine
const config = require('../config');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');
const common = require('../common');

function registerUser(req, done) {
    var u = clone(config.auth.default);
    
    //signup is used to finalize first time 3rd party login (like github)
    //when github auth succeeds for the first time, it creates a temporary jwt token 
    //containing github ID for example. We can apply that info here
    if(req.user && req.user.user) {
        for(var k in req.user.user) u[k] = req.user.user[k];
    }

    //from form
    u.username = req.body.username;
    u.fullname = req.body.fullname;
    u.email = req.body.email;

    //now register
    var user = db.User.build(u);
    logger.info("registering new user", u);
    user.setPassword(req.body.password, function(err) {
        if(err) return done(err);
        logger.debug("password set");
        user.save().then(function() {
            //add to default groups
            user.addMemberGroups(u.gids, function() {
                done(null, user);    
            });
        });
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

router.post('/', jwt({secret: config.auth.public_key, credentialsRequired: false}), function(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;

    function post_process(err, user) {
        if(err) return next(err);
        /*
        common.createClaim(user, function(err, claim) {
            if(err) return next(err);
            var jwt = common.signJwt(claim);
        */

        if(config.local.email_confirmation/* && !user.email_confirmed*/) {
            common.send_email_confirmation(req.headers.referer||config.local.url, user, function(err) {
                if(err) {
                    if(!req.user) {
                        //if we fail to send email, we should unregister the user we just created
                        user.destroy({force: true}).then(function() {
                            logger.error("removed newly registred record - email failurer");
                            res.status(500).json({message: "Failed to send confirmation email. Please make sure your email address is valid."});
                        });
                    } else {
                        res.status(500).json({message: "Failed to send confirmation email. Please make sure your email address is valid"});
                    }
                } else {
                    //res.json({path:'/confirm_email/'+user.id, message: "Confirmation Email has been sent. Please check your email inbox.", jwt: jwt});
                    res.json({path:'/confirm_email/'+user.id, message: "Confirmation email has been sent. Please follow the instruction once you receive it."});
                }
            });
        } else {
            //no need for email confrmation.. issue jwt!
            common.createClaim(user, function(err, claim) {
                if(err) return next(err);
                var jwt = common.signJwt(claim);
                res.json({jwt: jwt, sub: user.id});
            });
        }
    }

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
                    registerUser(req, post_process);
                }
            });
        }
    });
})

module.exports = router;

