#!/usr/bin/node
'use strict';

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Update specified user's scope 
//
// Usage: 
// ./auth.js modscope --username hayashis --set '{common: ["user", "admin"]}'
// ./auth.js modscope --username hayashis --add '{common: ["user", "admin"]}'
// ./auth.js modscope --username hayashis --del '{common: ["user", "admin"]}'
//

//contrib
var argv = require('optimist').argv;
var winston = require('winston');
var jwt = require('jsonwebtoken');
//var _ = require('underscore');

//mine
var config = require('../api/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');

switch(argv._[0]) {
case "modscope": modscope(); break;
case "listuser": listuser(); break;
case "issue": issue(); break;
default:
    logger.error("unknown command "+argv[1]); 
}

function listuser() {
    db.User.findAll({attributes: ['id', 'username', 'email', 'active', 'scopes', 'times', 'createdAt'], raw: true})
    .then(function(users) {
        console.dir(users);
    }); 
}

function issue() {
    if(!argv.scopes || !argv.sub) {
        logger.error("./auth.js issue --scopes '{common: [\"user\"]}' --sub 'my_service'");
        process.exit(1);
    }

    var claim = {
        "iss": config.auth.iss,
        //"exp": (Date.now() + "+(argv.exp*1000*3600*24)+")/1000, //no expiration?
        "iat": (Date.now())/1000,
        "scopes": JSON.parse(argv.scopes),
        "sub": argv.sub,
    };

    var token = jwt.sign(claim, config.auth.private_key, config.auth.sign_opt);
    console.log(token);

    //verify to check
    jwt.verify(token, config.auth.public_key, function(err, decoded) {
        if(err) throw err;
        console.log("decoded:");
        console.log(JSON.stringify(decoded, null, 4));
    });
}

function modscope() {
    if(!argv.username) {
        logger.error("please specify --username <username> --set/add/del '{{common: [\"user\", \"admin\"]}}'");
        process.exit(1);
    }

    function add(base, sub) {
        if(typeof sub == 'object' && sub.constructor == Array) {
            sub.forEach(function(item) {
                if(!~base.indexOf(item)) base.push(item);
            });
        } else if(typeof sub == 'object') {
            for(var k in sub) {
                if(base[k] === undefined) base[k] = sub[k];
                else add(base[k], sub[k]);
            }
        }
    }

    function del(base, sub) {
        if(typeof sub == 'object' && sub.constructor == Array) {
            sub.forEach(function(item) {
                var pos = base.indexOf(item);
                if(~pos) base.splice(pos, 1);
            });
        } else if(typeof sub == 'object') {
            for(var k in sub) {
                if(base[k] !== undefined) del(base[k], sub[k]);
            }
        }
    }

    db.User.findOne({where: {"username": argv.username}})
    .then(function(user) {
        if(!user) return logger.error("can't find user:"+argv.username);
        return user;
    })
    .then(function(user) {
        logger.debug("before");
        logger.debug(JSON.stringify(user, null, 4));
        if(argv.set) {
            user.scopes = JSON.parse(argv.set);
        }
        if(argv.add) {
            //user.scopes = set(user.scopes, JSON.parse(argv.add));
            add(user.scopes, JSON.parse(argv.add));
        }
        if(argv.del) {
            //user.scopes = _.difference(user.scopes, JSON.parse(argv.del));
            del(user.scopes, JSON.parse(argv.del));
        }
        user.save().then(function() {
            logger.info("after");
            logger.debug(JSON.stringify(user, null, 4));
        }).catch(function(err) {
            logger.error(err);
        });
    });
}
