var express = require('express');
var jwt = require('express-jwt');
var router = express.Router();
var fs = require('fs');
var _ = require('underscore');

var jwt_helper = require('../jwt_helper');

var User = require('../models/user').User;

var publicKey = fs.readFileSync('config/auth.pub');

//TODO - express-jwt doesn't check for scope .. submitted this https://github.com/auth0/express-jwt/issues/85
router.get('/profile', jwt({secret: publicKey}), function(req, res, next) {
    if(req.user.scopes.common.indexOf("user") == -1) {
        return res.send(401, {message: "Unauthorized"});
    }

    //var username = req.query.username;
    //var email = req.query.email;
    User.findOne({_id: req.user.sub}, function (err, user) {
        if (err) { return done(err); }
        res.json({email: user.local.email, profile: user.profile});
    });
})

//TODO - check scope
router.post('/profile', jwt({secret: publicKey}), function(req, res, next) {
    if(req.user.scopes.common.indexOf("user") == -1) {
        return res.send(401, {message: "Unauthorized"});
    }
    User.findOne({_id: req.user.sub}, function (err, user) {
        if (err) { return next(err); }
        //console.dir(user.profile);
        //console.dir(req.body);
        
        //email address updated?
        if(req.body.email != user.local.email) {
            console.log("user changed email address to "+req.body.email);
            //TODO - check for uniqueness (enforced via db)
            user.local.email = req.body.email;
            user.local.email_confirmed = false;
        }

        user.profile.fullname = req.body.profile.fullname;
        user.profile.nickname = req.body.profile.nickname;
        console.dir(user);
        user.save(function(err) {
            if(err) return next(err); //res.send(500, err);
            res.json({message: "Updated!"});
        });
    });
});

module.exports = router;
