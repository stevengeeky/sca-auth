
//contrib
var express = require('express');
var router = express.Router();
var passport = require('passport');
var passport_localst = require('passport-local').Strategy;
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var jwt_helper = require('../jwt_helper');

var db = require('../models');

router.post('/refresh', jwt({secret: config.auth.public_key}), function(req, res, next) {
    //console.log("looking for user id:"+req.user.sub);
    db.User.findOne({where: {id: req.user.sub}}).then(function(user) {
        //return res.send(500, new Error("test"));
        if (!user) return next(new Error("can't find user id:"+req.user.sub));
        //console.dir(user);
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        return res.json({jwt: jwt});
    });
});

router.get('/health', function(req, res) {
    res.json({status: 'ok'});
});
/*
router.get('/config', function(req, res) {
    var c = {whatever: 'hello'};
    if(config.local) {
        c.local = {
            //TODO
        };
    }
    if(config.iucas) {
        c.iucas = {
            //TODO
        };
    }
    res.json(c);    
});
*/

//server side config need to render ui (public)
router.get('/config', function(req, res) {
    var c = {};
    if(config.local) {
        c.local = {};
    }
    if(config.iucas) {
        c.iucas = {};
    }
    if(config.git) {
        c.git = {};
    }
    if(config.google) {
        c.google= {};
    }
    res.json(c); 
});

//returns things that user might want to know about himself.
router.get('/me', jwt({secret: config.auth.public_key}), function(req, res) {
    db.User.findOne({
        where: {id: req.user.sub},
        attributes: ['username', 'email', 'iucas', 'googleid', 'gitid'],
    }).then(function(user) {
        if(user) res.json(user);
        else res.status(404).end();
    });
});

/*
//return id, username, email of all users (used by user selector or such)
router.get('/users', jwt({secret: config.auth.public_key}), function(req, res) {
    db.User.findAll({
        //TODO what if local username/email logins are disabled? 
        //I should return casid or such instead
        attributes: ['id', 'username', 'email'],
    }).then(function(users) {
        res.json(users);
    });
});
*/

module.exports = router;
