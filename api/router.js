'use strict';

var express = require('express');
var router = express.Router();

// middleware specific to this router
router.use(function timeLog(req, res, next) {
    console.log('Time: ', Date.now());
    next();
});

// define the home page route
router.get('/', function(req, res) {
    res.send('Birds home page');
});

// define the about route
router.get('/health', function(req, res) {
    res.json({'status':'running', 'name': 'auth'});
});

module.exports = router;
