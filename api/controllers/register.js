var express = require('express');
var router = express.Router();
var jwt_helper = require('../jwt_helper');

var config = require('../config/config').config;

var User = require('../models').User;

function registerUser(username, email, password, done) {
    //console.log("registering user");
    var user = User.build({
        username: username, 
        email: email,
        scopes: config.default_scopes
    });
    user.setPassword(password, function(err) {
        //console.log("set password done");
        //console.dir(err);
        if(err) return done(err);
        user.save().then(done);
    });
}

router.post('/', function(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    
    //console.log("registration request for "+username);
    //console.dir(req);

    User.findOne({where: {username: username} }).then(function(user) {
        if(user) {
            return next(new Error('The username: '+username+' is already registered. Please try logging in with username & password, or register with a different username.'));
        } else {
            //console.log("proceeding with registgration");
            registerUser(username, email, password, function(user) {
                var claim = jwt_helper.createClaim(user);
                var jwt = jwt_helper.signJwt(claim);
                res.json({message: "Successfully Registered!", jwt: jwt});
            });        
        }
    });
})

module.exports = router;

