var express = require('express');
var router = express.Router();

var passport = require('passport');
var passport_localst = require('passport-local').Strategy;

var jwt_helper = require('../jwt_helper');

var User = require('../models').User;

passport.use(new passport_localst(
    function(username, password, done) {
        User.findOne({where: {$or: {"username": username, "email": username }}}).then(function(user) {
            //console.log("user query result");
            //console.dir(user);
            if (!user) {
                return done(null, false, { message: 'Incorrect email/username.' });
            } else {
                if(!user.isPassword(password)) {
                    return done(null, false, { message: 'Incorrect password.' });
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

module.exports = router;
