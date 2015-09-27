'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('./config/config');
var jwt_helper = require('./jwt_helper');
var models = require('./models');
var local = require('./controllers/local');
var iucas = require('./controllers/iucas');
var signup = require('./controllers/signup');
//var user = require('./controllers/user'); 

router.use('/', local);
router.use('/iucas', iucas);
router.use('/signup', signup);
//router.use('/user', user);

router.post('/refresh', jwt({secret: config.auth.public_key}), function(req, res, next) {
    //console.log("looking for user id:"+req.user.sub);
    models.User.findOne({where: {id: req.user.sub}}).then(function(user) {
        //return res.send(500, new Error("test"));
        if (!user) return next(new Error("can't find user id:"+req.user.sub));
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
