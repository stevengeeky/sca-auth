#!/usr/bin/node
'use strict';

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Update specified user's scope 
//
// Usage: ./setscope.js --username hayashis --scope '{common: ["user", "admin"]}'
//

//contrib
var argv = require('optimist').argv;
var winston = require('winston');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

if(!argv.username) {
    logger.error("please specify --username <username>");
    process.exit(1);
}
if(!argv.scope) {
    logger.error("please specify --scope '(scope json)'");
    process.exit(1);
}

db.User.findOne({where: {"username": argv.username}})
.then(function(user) {
    if(!user) return logger.error("can't find user:"+argv.username);
    /*
    if(~user.scopes.common.indexOf('admin')) {
        logger.error("user is already an admin");
        process.exit(1);
    }
    */

    //user.scopes.other = ['something'];
    //user.email = "updated+1@iu.edu";
    //logger.debug(user.scopes);
    //user.updateAttributes({scopes: user.scopes});
    return user;
})
.then(function(user) {
    //user.scopes.common.push('admin');
    try {
        var scopes = JSON.parse(argv.scope);
    } catch(e) {
        logger.error("failed to parse specified scope. please make sure it's valid JSON");
        process.exit(1);
    }
    user.scopes = scopes;
    user.save().then(function() {
        //logger.debug(JSON.stringify(user, null, 4));
        //logger.info(argv.username +" is now an admin");
        /*
        db.User.findOne({where: {username: argv.username}}).then(function(up) {
            logger.debug(JSON.stringify(up, null, 4));
        });
        */
        logger.info("updated scope");
    }).catch(function(err) {
        logger.error(err);
    });
});


