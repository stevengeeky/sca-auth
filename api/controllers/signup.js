
//contrib
var express = require('express');
var router = express.Router();
var jwt_helper = require('../jwt_helper');
var winston = require('winston');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

function registerUser(username, email, password, done) {
    var user = db.User.build({
        username: username, 
        email: email,
        scopes: config.auth.default_scopes
    });
    logger.info("registering user");
    user.setPassword(password, function(err) {
        logger.debug("set password done");
        if(err) return done(err);
        user.save().then(done);
    });
}

router.post('/', function(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    //TODO - validate password strength?
    
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
                    registerUser(username, email, password, function(user) {
                        var claim = jwt_helper.createClaim(user);
                        var jwt = jwt_helper.signJwt(claim);
                        res.json({message: "Successfully Registered!", jwt: jwt});
                    });        
                }
            });
        }
    });
})

module.exports = router;

