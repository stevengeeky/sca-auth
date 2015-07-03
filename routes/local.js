var express = require('express');
var router = express.Router();

var passport = require('passport');
var passport_localst = require('passport-local').Strategy;

var jwt_helper = require('../jwt_helper');

var User = require('../models/user').User;

passport.use(new passport_localst(
    function(username, password, done) {
        User.findOne({"local.username": username }, function (err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if(!user.isPasswordMatch(password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        });
    }
));

router.post('/auth', function(req, res, next) {
    //console.dir(req.body);
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            res.status("404"); //should I return 401 Unauthorized?
            return res.json(info);
        }
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        //console.dir(claim);
        //jwt_helper.setJwtCookies(claim, res);
        //return res.json({profile: user.profile, scopes: user.scopes});
        return res.json({access_token: jwt});
        /*
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.json(info);
        });
        */
    })(req, res, next);
});

module.exports = router;
