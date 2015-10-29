#!/usr/bin/node
'use strict';

//contrib
var argv = require('optimist').argv;
//var winston = require('winston');
var jwt = require('jsonwebtoken');

//mine
var config = require('../config/config');
//var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

if(!argv.scopes || !argv.sub) {
    logger.error("./signjwt.js --scopes '{common: [\"user\"]}' --sub 'my_service'");
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
//console.log("Authentication: Bearer "+token);
console.log(token);

//verify to check
jwt.verify(token, config.auth.public_key, function(err, decoded) {
    if(err) throw err;
    console.log("decoded:");
    console.log(JSON.stringify(decoded, null, 4));
});

