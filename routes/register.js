var express = require('express');
var router = express.Router();
var jwt_helper = require('../jwt_helper');

var config = require('../config/config').config;

var User = require('../models/user').User;

function registerUser(username, email, password, done) {
    var user = new User({
        local: {username: username, email: email}, 
        scopes: config.default_scopes
    });
    user.setPassword(password, function(err) {
        if(err) return done(err);
        user.save(function(err) {
            done(err, user);
        });
    });
}

router.post('/', function(req, res, next) {
    //console.dir(req);
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    console.log("registration request for "+username);
    User.findOne({"local.username": username }, function (err, user) {
        if (err) { return next(err); }
        if(user) {
            //res.status(500);
            //res.json({message: 'The username: '+username+' is already registered. If you are already registered, please try logging in, or register a different username.'});
            return next(new Error('The username: '+username+' is already registered. Please try logging in with username & password, or register with a different username.'));
        } else {
            console.log("proceeding with registgration");
            registerUser(username, email, password, function(err, user) {
                if(err) return next(err);
                var claim = jwt_helper.createClaim(user);
                var jwt = jwt_helper.signJwt(claim);
                res.json({message: "Successfully Registered!", jwt: jwt});
            });        
        }
    });
})

module.exports = router;

