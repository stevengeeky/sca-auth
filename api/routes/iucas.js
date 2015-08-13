var express = require('express');
var router = express.Router();
var request = require('request');

var config = require('../config/config').config;

var jwt_helper = require('../jwt_helper');
var User = require('../models/user').User;

function finduserByiucasid(id, done) {
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
        local: {username: id, email: email, email_confirmed: true}, //let's use IU id as local username
        iucas: {id: id},
        scopes: config.default_scopes
    });
    user.save(function(err) {
        done(err, user);
    });
}

router.get('/', function(req, res, next) {
    var ticket = req.query.casticket;
    var casurl = config.casurl;
    
    //TODO should I make this configurable?
    request('https://cas.iu.edu/cas/validate?cassvc=IU&casticket='+ticket+'&casurl='+casurl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var reslines = body.split("\n");
            if(reslines[0].trim() == "yes") {
                var uid = reslines[1].trim();
                finduserByiucasid(uid, function(err, user, msg) {
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
                        User.findOne({'local.username': uid}, function(err, user) {
                            if(err) return next(err);
                            if(user) {
                                console.log("local.username already registered:"+uid+"(can't auto register)");
                                //why am I passing this message via errors.html?
                                //because in order to login via IU CAS, I had to make browser jump to IU CAS page and back 
                                var messages = [{type: "error", title: "Registration Failed", message: "This is the first time you login with IU CAS account, "+
                                    "but we couldn't register this account since the username '"+uid+"' is already registered in our system. "+
                                    "If you have already registered with username / password, please login using username / password first, "+
                                    "then associate your IU CAS account under your authentication profile settings."}];
                                res.cookie('messages', JSON.stringify(messages));
                                return res.redirect(config.login_url);
                            } else {
                                registerUser(uid, uid+"@iu.edu", function(err, user) {
                                    if(err) return next(err);
                                    var claim = jwt_helper.createClaim(user);
                                    var jwt = jwt_helper.signJwt(claim);
                                    return res.redirect(config.success_url+"?jwt="+jwt);
                                });
                            }
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
