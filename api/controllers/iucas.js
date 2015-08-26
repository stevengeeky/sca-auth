
//contrib
var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);

var jwt_helper = require('../jwt_helper');
var User = require('../models').User;

function finduserByiucasid(id, done) {
    User.findOne({where: {"iucas": id}}).then(function(user) {
        if (!user) {
            return done(null, false, { message: "Couldn't find registered IU CAS ID:"+id });
        }
        return done(null, user);
    });
}

function registerUser(id, email, done) {
    User.create({
        username: id, //let's use IU id as local username
        email: email, 
        email_confirmed: true, //let's trust IU id
        iucas: id,
        scopes: config.auth.default_scopes
    }).then(done);
}

router.get('/', function(req, res, next) {
    var ticket = req.query.casticket;

    /*
    if(!req.headers.referer) {
        return next(new Error("header: referer must be set to the original URL used for casurl"));
    }
    var casurl = req.headers.referer; //config.casurl;
    */
    var casurl = config.iucas.home_url;
    
    //TODO should I make this configurable?
    //console.log("valiating casticket:"+ticket);
    //console.log("valiating casurl:"+casurl);
    //console.dir(req.headers.referer);
    logger.debug("validating cas ticket:"+ticket+" casurl:"+casurl);
    request('https://cas.iu.edu/cas/validate?cassvc=IU&casticket='+ticket+'&casurl='+casurl, function (err, response, body) {
        if(err) return next(err);
        if (response.statusCode == 200) {
            var reslines = body.split("\n");
            if(reslines[0].trim() == "yes") {
                var uid = reslines[1].trim();
                finduserByiucasid(uid, function(err, user, msg) {
                    if(err) {
                        res.status("500");
                        return res.end();
                    }
                    if(!user) {
                        console.log("registering new user with iucas id:"+uid);
                        User.findOne({where: {'username': uid}}).then(function(user) {
                            //if(err) return next(err);
                            if(user) {
                                console.log("username already registered:"+uid+"(can't auto register)");
                                //why am I passing this message via errors.html?
                                //because in order to login via IU CAS, I had to make browser jump to IU CAS page and back 
                                //TODO - instead of showing this error message, maybe I should redirect user to
                                //a page to force user to login via user/pass, then associate the IU CAS IU 
                                //once user logs in 
                                var messages = [{type: "error", title: "Registration Failed", message: "This is the first time you login with IU CAS account, "+
                                    "but we couldn't register this account since the username '"+uid+"' is already registered in our system. "+
                                    "If you have already registered with username / password, please login using username / password first, "+
                                    "then associate your IU CAS account under your authentication profile settings."}];
                                res.cookie('messages', JSON.stringify(messages));
                                return res.redirect(config.iucas.home_url);
                            } else {
                                registerUser(uid, uid+"@iu.edu", function(user) {
                                    //if(err) return next(err);
                                    var claim = jwt_helper.createClaim(user);
                                    var jwt = jwt_helper.signJwt(claim);
                                    return res.redirect(config.iucas.success_url+"?jwt="+jwt);
                                });
                            }
                        });
                    } else {
                        //all good. issue token
                        console.log("iucas authentication successful. iu id:"+uid);
                        var claim = jwt_helper.createClaim(user);
                        var jwt = jwt_helper.signJwt(claim);
                        return res.redirect(config.iucas.success_url+"?jwt="+jwt);
                    }
                });
            } else {
                console.log("IUCAS failed to validate");
                res.sendStatus("403");//Is 403:Forbidden appropriate return code?
            }
        } else {
            //non 200 code...
            next(new Error(body));
        }
    })
});

module.exports = router;
