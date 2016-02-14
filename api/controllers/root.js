
//contrib
var express = require('express');
var router = express.Router();
var passport = require('passport');
var passport_localst = require('passport-local').Strategy;
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var common = require('../common');
var db = require('../models');

router.post('/refresh', jwt({secret: config.auth.public_key}), function(req, res, next) {
    db.User.findOne({where: {id: req.user.sub}}).then(function(user) {
        if(!user) return next("Couldn't find any user with sub:"+req.user.sub);
        var err = user.check();
        if(err) return next(err);
        common.createClaim(user, function(err, claim){
            if(err) return next(err);
            var jwt = common.signJwt(claim);
            return res.json({jwt: jwt});
        });
    });
});

router.post('/send_email_confirmation', function(req, res, next) {
    db.User.findOne({where: {id: req.body.sub}}).then(function(user) {
        if(!user) return next("Couldn't find any user with sub:"+req.body.sub);
        if(!req.headers.referer) return next("referer not set.. can't send confirmation");
        common.send_email_confirmation(req.headers.referer, user, function(err) {
            if(err) return next(err);
            res.json({message: 'Sent confirmation email with subject: '+config.email_confirmation.subject});
        });
    });
});
router.post('/confirm_email', function(req, res, next) {
    db.User.findOne({where: {email_confirmation_token: req.body.token}}).then(function(user) {
        if(!user) return next("Couldn't find any user with token:"+req.body.token);
        if(user.email_confirmed) return next("Email already confirmed.");
        user.email_confirmed = true;
        user.save().then(function() {
            res.json({message: "Email address confirmed! Please re-login."});
        });
    });
});

router.get('/health', function(req, res) {
    res.json({status: 'ok'});
});

//server side config need to render ui (public)
router.get('/config', function(req, res) {
    var c = {
        allow_signup: config.auth.allow_signup,
    };
    if(config.local) {
        c.local = {};
    }
    if(config.iucas) {
        c.iucas = {};
    }
    if(config.git) {
        c.git = {};
    }
    if(config.x509) {
        c.x509= {};
    }
    if(config.google) {
        c.google= {};
    }
    res.json(c); 
});

//returns things that user might want to know about himself.
//password_hash will be set to true if the password is set, otherwise null
router.get('/me', jwt({secret: config.auth.public_key}), function(req, res) {
    db.User.findOne({
        where: {id: req.user.sub},
        //password_hash is replace by true/false right below
        attributes: ['username', 'fullname', 'email', 'email_confirmed', 'iucas', 'googleid', 'gitid', 'x509dns', 'times', 'password_hash'],
    }).then(function(user) {
        if(!user) return res.status(404).end();
        if(user.password_hash) user.password_hash = true;
        res.json(user);
    });
});

//return list of all users (minus password) admin only - used by user admin
router.get('/users', jwt({secret: config.auth.public_key}), function(req, res) {
    if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.User.findAll({
        //password_hash is replace by true/false right below
        attributes: [
            'id', 'username', 'fullname', 'password_hash', 
            'email', 'email_confirmed', 'iucas', 'googleid', 'gitid', 'x509dns', 
            'times', 'scopes', 'active'],
    }).then(function(users) {
        users.forEach(function(user) {
            if(user.password_hash) user.password_hash = true;
        });
        res.json(users);
    });
});

//return detail from just one user - admin only (somewhat redundant from /users ??)
router.get('/user/:id', jwt({secret: config.auth.public_key}), function(req, res) {
    if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.User.findOne({
        where: {id: req.params.id},
        attributes: [
            'id', 'username', 'fullname',
            'email', 'email_confirmed', 'iucas', 'googleid', 'gitid', 'x509dns', 
            'times', 'scopes', 'active'],
    }).then(function(user) {
        res.json(user);
    });
});

//update user info (admin only)
router.put('/user/:id', jwt({secret: config.auth.public_key}), function(req, res, next) {
    if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.User.findOne({where: {id: req.params.id}}).then(function(user) {
        if (!user) return next("can't find user id:"+req.params.id);
        user.update(req.body).then(function(err) {
            res.json({message: "User updated successfully"});
        });
    });
});

//return list of all groups (open to all users)
router.get('/groups', jwt({secret: config.auth.public_key}), function(req, res) {
    //if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.Group.findAll({
        include: [
            {model: db.User, as: 'Admins', attributes: ['id', 'email', 'fullname']},
            {model: db.User, as: 'Members', attributes: ['id', 'email', 'fullname']},
        ],
        //raw: true,
    }).then(function(_groups) {
        var groups = JSON.parse(JSON.stringify(_groups));
        groups.forEach(function(group) {
            group.canedit = ~req.user.scopes.sca.indexOf("admin");
            group.Admins.forEach(function(admin) {
                if(admin.id == req.user.sub) {
                    group.canedit = true;
                }
            }); 
        });
        res.json(groups);
    });
});

//update group (sca adimn, or admin of the group can update)
router.put('/group/:id', jwt({secret: config.auth.public_key}), function(req, res, next) {
    //console.dir(req.body);
    db.Group.findOne({where: {id: req.params.id}}).then(function(group) {
        if (!group) return next("can't find group id:"+req.params.id);
        //first I need to get current admins..
        group.getAdmins().then(function(admins) {
            //console.log(req.user.scopes.sca.indexOf("admin"));
            var admin_ids = [];
            admins.forEach(function(admin) {
                admin_ids.push(admin.id.toString()); //toString so that I can compare with indexOf
            });
            //console.dir(req.user.sub);
            //console.dir(admin_ids);
            //console.log(admin_ids.indexOf(req.user.sub));
            if(!~req.user.scopes.sca.indexOf("admin") && !~admin_ids.indexOf(req.user.sub)) return res.send(401);
            //then update everything
            group.update(req.body.group).then(function(err) {
                group.setAdmins(req.body.admins).then(function() {
                    group.setMembers(req.body.members).then(function() {
                        res.json({message: "Group updated successfully"});
                    });
                });
            }).catch(function(err) {
                next(err);
            });
        });
    });
});

//create new group (any user can create group?)
router.post('/group', jwt({secret: config.auth.public_key}), function(req, res, next) {
    //if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    var group = db.Group.build(req.body.group);
    group.save().then(function() {
        group.setAdmins(req.body.admins).then(function() {
            group.setMembers(req.body.members).then(function() {
                res.json({message: "Group created", group: group});
            });
        });
    }).catch(function(err) {
        next(err);
    });
});

//return detail from just one group (open to all users)
router.get('/group/:id', jwt({secret: config.auth.public_key}), function(req, res) {
    //if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.Group.findOne({
        where: {id: req.params.id},
        include: [
            {model: db.User, as: 'Admins', attributes: ['id', 'email', 'fullname']},
            {model: db.User, as: 'Members', attributes: ['id', 'email', 'fullname']},
        ]
    }).then(function(group) {
        res.json(group);
    });
});

//return all profiles (open to all users)
router.get('/profiles', jwt({secret: config.auth.public_key}), function(req, res) {
    db.User.findAll({
        attributes: [ 'id', 'fullname', 'email', 'active']
    }).then(function(profiles) {
        res.json(profiles);
    });
});

module.exports = router;
