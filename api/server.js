#!/usr/bin/node

//os
var fs = require('fs');
var path = require('path');

//contrib
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var Sequelize = require('sequelize');
var passport = require('passport');
var jwt_helper = require('./jwt_helper');
var winston = require('winston');
var expressWinston = require('express-winston');

//mine
var config = require('./config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');

//init express
var app = express();
//app.use(config.logger.express);
app.use(bodyParser.json()); //parse application/json
app.use(bodyParser.urlencoded({extended: false})); //parse application/x-www-form-urlencoded //TODO - do we need this?
app.use(expressWinston.logger(config.logger.winston)); 
app.use(cookieParser()); //TODO - do we really need this?
app.use(jwt_helper.tokenParser());
app.use(passport.initialize());//needed for express-based application

app.use('/', require('./router'));

/*
app.use(function(req, res, next) {
    // catch 404 and forward to error handler
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    console.dir(err);
    res.status(err.status || 500);
    res.json({message: err.message});
});
*/

//error handling
app.use(expressWinston.errorLogger(config.logger.winston));
app.use(function(err, req, res, next) {
    logger.info(err);
    logger.info(err.stack);
    res.status(err.status || 500);
    res.json({message: err.message, /*stack: err.stack*/}); //let's hide callstack for now
});

process.on('uncaughtException', function (err) {
    //TODO report this to somewhere!
    logger.error((new Date).toUTCString() + ' uncaughtException:', err.message)
    logger.error(err.stack)
    //process.exit(1); //some people think we should do this.. but I am not so sure..
})

exports.app = app;
exports.start = function(cb) {
    db.sequelize
    .sync(/*{force: true}*/)
    .then(function() {
        var port = process.env.PORT || config.express.port || '8080';
        var host = process.env.HOST || config.express.host || 'localhost';
        app.listen(port, host, function(err) {
            if(err) return cb(err);
            console.log("Express server listening on port %d in %s mode", port, app.settings.env);
            cb(null);
        });
    });
}


