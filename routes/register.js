var express = require('express');
var router = express.Router();

var jwt_helper = require('../jwt_helper');

var User = require('../models/user').User;

router.get('/is_user_name_exist', function(req, res, next) {
    var username = req.query.username;
    var email = req.query.email;
    User.findOne({"local.username": username }, function (err, user) {
        if (err) { return done(err); }
        res.json({exist: (user !== null)});    
    });
})

module.exports = router;
