'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('./config/config');
var jwt_helper = require('./jwt_helper');
//var db = require('./models');

router.use('/', require('./controllers/root'));
router.use('/signup', require('./controllers/signup'));

if(config.local) {
    router.use('/local', require('./controllers/local'));
}
if(config.iucas) {
    router.use('/iucas', require('./controllers/iucas'));
}

module.exports = router;
