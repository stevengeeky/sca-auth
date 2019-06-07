'use strict';

//contrib
var Sequelize = require('sequelize');
var winston = require('winston');

//mine
const pwaConfig = require('../pwa-config');
const config = pwaConfig.getConfig();

var logger = new winston.Logger(config.logger.winston);

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Group', {
        name: Sequelize.STRING,
        desc: Sequelize.TEXT,
        active: { type: Sequelize.BOOLEAN, defaultValue: true }
    }, {
        classMethods: {
        },
        instanceMethods: {
        }
    });
}
