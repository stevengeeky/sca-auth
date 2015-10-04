#!/usr/bin/node
'use strict';

//contrib
var argv = require('optimist').argv;
var winston = require('winston');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

if(!argv.username) {
    logger.error("please specify --username <username> to set admin scope");
    process.exit(1);
}
db.User.findOne({where: {"username": argv.username}})
.then(function(user) {
    if(!user) return logger.error("can't find user:"+argv.username);
    if(~user.scopes.common.indexOf('admin2')) {
        logger.error("user is already an admin");
        process.exit(1);
    }

    //user.scopes.other = ['something'];
    //user.email = "updated+1@iu.edu";
    //logger.debug(user.scopes);
    //user.updateAttributes({scopes: user.scopes});
    return user;
})
.then(function(user) {
    user.scopes.common.push('admin2');
    user.save().then(function() {
        //logger.debug(JSON.stringify(user, null, 4));
        logger.info(argv.username +" is now an admin");
        /*
        db.User.findOne({where: {username: argv.username}}).then(function(up) {
            logger.debug(JSON.stringify(up, null, 4));
        });
        */
    }).catch(function(err) {
        logger.error(err);
    });
});


