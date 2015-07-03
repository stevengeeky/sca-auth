var express = require('express');
var router = express.Router();
var request = require('request');

var config = require('../config/config').config;

var jwt_helper = require('../jwt_helper');
var User = require('../models/user').User;

function finduser(id, done) {
    User.findOne({"iucas.id": id}, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
            return done(null, false, { message: "Couldn't find registered IU CAS ID:"+id });
        }
        return done(null, user);
    });
}

function registerUser(id, email, done) {
    var user = new User({
        iucas: {id: id},
        profile: {email: email, email_confirmed: true},
        scopes: config.default_scopes
    });
    user.save(function(err) {
        done(err, user);
    });
}

router.get('/', function(req, res, next) {
    var ticket = req.query.casticket;
    var casurl = config.casurl;
    request('https://cas.iu.edu/cas/validate?cassvc=IU&casticket='+ticket+'&casurl='+casurl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var reslines = body.split("\n");
            if(reslines[0].trim() == "yes") {
                var uid = reslines[1].trim();
                finduser(uid, function(err, user, msg) {
                    if(err) {
                        res.status("500");
                        return res.end();
                    }
                    if(!user) {
                        /*
                        //new user. let's register automatically
                        var user = {
                            "_id": null, 
                            "scopes": ["register"] 
                        };
                        var claim = jwt_helper.createClaim(user);  
                        claim.casid = uid;
                        var jwt = jwt_helper.signJwt(claim);
                        return res.redirect(config.registration_url+"?register_token="+jwt);
                        */
                        console.log("registering new user with iucas id:"+uid);
                        registerUser(uid, uid+"@iu.edu", function(err, user) {
                            if(err) throw err;
                            var claim = jwt_helper.createClaim(user);
                            var jwt = jwt_helper.signJwt(claim);
                            return res.redirect(config.success_url+"?jwt="+jwt);
                        });
                    } else {
                        //all good. issue token
                        console.log("iucas authentication successful. iu id:"+uid);
                        var claim = jwt_helper.createClaim(user);
                        var jwt = jwt_helper.signJwt(claim);
                        return res.redirect(config.success_url+"?jwt="+jwt);
                    }
                });
            } else {
                //IUCAS validation error
                res.sendStatus("403");//?
            }
        }
    })
});

module.exports = router;
