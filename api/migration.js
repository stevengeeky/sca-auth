
//contrib
var winston = require('winston');
var async = require('async');
var Promise = require('promise');
var Sequelize = require('sequelize');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');

var migrations = [
    /*
    function(qi, next) {
        //skipped
    },
    */
    /*
    function(qi, next) {
        logger.info("adding x509dn field for user table");
        qi.addColumn('Users', 'x509dn', Sequelize.STRING).then(function() {
            next();
        });
    },
    */
    /*
    function(qi, next) {
        next();
    },
    function(qi, next) {
        logger.info("removing column");
        qi.removeColumn('Users', 'x509dns').then(function() {
            next();
        });
    },
    */
    function(qi, next) {
        logger.info("adding x509dn field for user table");
        qi.addColumn('Users', 'x509dns', {type: Sequelize.TEXT, defaultValue: '[]'}).then(function() {
            next();
        });
    },
];

exports.run = function() {
    logger.debug("running migration");
    return new Promise(function(resolve, reject) {
        db.Migration.findOne({}).then(function(info) {
            //logger.debug(JSON.stringify(info, null, 4));
            if(!info) {
                //assume brand new - skip everything
                return db.Migration.create({version: migrations.length}).then(resolve);
            } else {
                var count = migrations.length;
                var ms = migrations.splice(info.version);
                qi = db.sequelize.getQueryInterface();
                async.eachSeries(ms, function(m, next) {
                    m(qi, next); 
                }, function(err) {
                    if(err) reject(err);
                    else { 
                        info.version = count; 
                        info.save().then(function() {
                            //logger.debug("done migration");
                            //logger.debug(JSON.stringify(info, null, 4));
                            resolve("migration complete");
                        });
                    }
                });
            }
        });
    });
}
