#!/usr/bin/node
'use strict';

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Update specified user's scope 
//
// Usage: 
// ./setscope.js --username hayashis --set '{common: ["user", "admin"]}'
// ./setscope.js --username hayashis --add '{common: ["user", "admin"]}'
// ./setscope.js --username hayashis --del '{common: ["user", "admin"]}'
//

//contrib
var argv = require('optimist').argv;
var winston = require('winston');
//var _ = require('underscore');

//mine
var config = require('../api/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');

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


