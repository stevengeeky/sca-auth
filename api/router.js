'use strict';

var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

var config = require('./config/config').config;

var jwt_helper = require('./jwt_helper');
var models = require('./models');

var local = require('./controllers/local');
var iucas = require('./controllers/iucas');
var register = require('./controllers/register');
//var user = require('./controllers/user'); 

router.use('/local', local);
router.use('/iucas', iucas);
router.use('/register', register);
//router.use('/user', user);

router.post('/refresh', jwt({secret: config.public_key}), function(req, res) {
    //console.log("looking for user id:"+req.user.sub);
    models.User.findOne({where: {id: req.user.sub}}).then(function(user) {
        //return res.send(500, new Error("test"));
        if (!user) throw new Error("can't find user id:"+req.user.sub);
        //console.dir(user);
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        return res.json({jwt: jwt});
    });
});

router.get('/health', function(req, res) {
    res.json({status: 'ok'});
});

module.exports = router;
