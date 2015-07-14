#!/usr/bin/node

var express = require('express');
var jwt = require('express-jwt');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var fs = require('fs');

var passport = require('passport');
var jwt_helper = require('./jwt_helper');

var local = require('./routes/local'); //local user/pass
var iucas = require('./routes/iucas');
var register = require('./routes/register');
var user = require('./routes/user');

var User = require('./models/user').User;

//var route_iucas = require('./routes/iucas');
//var saml = require('passport-saml');

var config = require('./config/config').config;

var app = express();
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
//app.set('env', config.environment || process.env.env);

//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger(app.get('DEBUG'))); //TODO - pull it from config or app.get('env')?

//app.use(require('less-middleware')(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'public')));
//app.use('/bower', express.static(path.join(__dirname, 'bower_components')));

app.use(bodyParser.json()); //parse application/json
app.use(bodyParser.urlencoded({ extended: false})); //parse application/x-www-form-urlencoded
//app.use(expressValidator());

app.use(cookieParser());
app.use(jwt_helper.tokenParser());
app.use(passport.initialize());//needed for express-based application

app.use('/local', local);
app.use('/iucas', iucas);
app.use('/register', register);
app.use('/user', user);

//used for test
var publicKey = fs.readFileSync('config/auth.pub');
app.get('/verify', jwt({secret: publicKey}), function(req, res) {
    //console.dir(req.user);
    res.json(req.user);
});

//refresh jwt - as long as it hasn't expired, etc..
app.post('/refresh', jwt({secret: publicKey}), function(req, res) {
    User.findOne({_id: req.user.sub}, function (err, user) {
        //return res.send(500, new Error("test"));
        if (err) { return res.send(500, err); }
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        return res.json({jwt: jwt});
    });
});

//auth routes (main login form, registeration, confirmation, etc..)
//app.use(config.path_prefix+'/', route_index);

//start of all the auth handlers
//app.use(config.path_prefix+'/iucas', route_iucas);

/*
var spcert = fs.readFileSync('/etc/grid-security/http/cert.pem', 'utf-8');
var spkey = fs.readFileSync('/etc/grid-security/http/key.pem', 'utf-8');
var idpcert = fs.readFileSync('static/incommon.pem', 'utf-8');

var samlStrategy = new saml.Strategy({
    callbackUrl: 'https://trident.soichi.us/auth/login/callback',
    //entryPoint: 'https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php',
    entryPoint: 'https://cas-reg.uits.iu.edu/cas-sp',
    issuer: 'passport-saml', 
    entityID: 'urn:mace:incommon:iu.edu',
    cert: idpcert, //to validate the incommin gSAML responses
    decryptionCert: spcert,
    decryptionPvk: spkey,
    identifierFormat: 'urn:mace:dir:attribute-def:cn' 
}, function(profile, done) {
    console.log("profile %j", profile);
    var user = {
        name: profile.cn,
        email: profile.email
    };
    return done(null, user);
});
passport.use(samlStrategy);
*/


/* for session
passport.serializeUser(function(user, done){
    done(null, user);
});

passport.deserializeUser(function(user, done){
    done(null, user);
});
*/

/*
app.get('/login', 
    passport.authenticate('saml', {failureRedirect: '/login/fail'}),
    function(req, res) {
        console.log("here is get /login");
        res.send('hello');
    }     
);

app.get('/login/fail', 
    function(req, res) {
        res.send(401, 'Login failed');
    }
);

app.get('/Shibboleth.sso/Metadata', 
    function(req, res) {
        res.type('application/xml');
        res.send(200, samlStrategy.generateServiceProviderMetadata(spcert));
    }
);

app.post('/login/callback',
    passport.authenticate('saml', { failureRedirect: '/login/fail', failureFlash: true }),
    function(req, res) {
        console.log("posting /login/callback");
        res.redirect('/auth');
    }
);
*/

/*
passport.serializeUser(function(user, done) {
  done(null, user.username);
});
*/
/*
passport.deserializeUser(function(username, done) {
    console.log("deserializing "+username);
});
*/
/*
app.use('/auth/iucas/logout', function(req, res, next) {
    req.logout();
    res.redirect('/iucas');
});
app.use('/auth/iucas/login', passport.authenticate('iucas', { failureRedirect: '/login/iucas-fail' }), function(req, res, next) {
    console.log("successfully logged in as "+req.user.username);
    res.redirect('/iucas');
});
*/
/*
app.use('/auth/iucas', function(req, res, next) {
    console.dir(req.user);
    res.json(req.user);
});
app.use('/', function(req, res, next) {
    res.redirect('/auth/incas');
});
*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    //console.dir(req.headers.authorization);
    //console.error("error handler invoked");
    console.dir(err);
    res.status(err.status || 500);
    res.json({message: err.message});
});

module.exports = app;

