
//contrib
var express = require('express');
var router = express.Router();
var jwt_helper = require('../jwt_helper');
var winston = require('winston');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

function registerUser(body, done) {
    var user = db.User.build({
        username: body.username, 
        email: body.email,
        scopes: config.auth.default_scopes
    });
    logger.info("registering user");
    user.setPassword(body.password, function(err) {
        if(err) return done(err);
        logger.debug("set password done");
        user.save().then(done);
    });
}

router.post('/', function(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;

    //TODO - validate password strength? (req.body.password)
    
    //check for username already taken
    db.User.findOne({where: {username: username} }).then(function(user) {
        if(user) {
            //TODO - maybe I should go ahead and forward user to login form?
            return next(new Error('The username you chose is already registered. If it is yours, please try signing in, or register with a different username.'));
        } else {
            //check for email already taken
            db.User.findOne({where: {email: email} }).then(function(user) {
                if(user) {
                    //TODO - maybe I should go ahead and forward user to login form?
                    return next(new Error('The email address you chose is already registered. If it is yours, please try signing in, or register with a different email address.'));
                } else {
                    registerUser(req.body, function(user) {
                        var claim = jwt_helper.createClaim(user);
                        var jwt = jwt_helper.signJwt(claim);
                        res.json({message: "Successfully Registered!", jwt: jwt, sub: user.id});
                    });        
                }
            });
        }
    });
})

module.exports = router;

