var mongoose = require('mongoose');
var request = require('supertest')
var assert = require('assert');

var config = require('../config/config.js').config;

process.env.DEBUG="*";

before(function(done) {
    console.log("connecting to mongo");
    mongoose.connect(config.mongodb, {}, done);
});

describe('/query', function() {
    var app = require('../app');
    describe('/', function() {
        it('make sure /(index) redirect', function(done) {
            request(app).get('/')
            .expect(302)
            .end(function(err, res)  {
                if(err) throw err;
                done();
            });
        });
    });

    describe('/api/query', function() {
        it('try finding known record', function(done) {
            request(app).get('/api/query/find')
            .query({
                select: '', 
                //where: {'headers.BodyPartExamined': 'BRAIN' }
                where: {'SOPInstanceUID': '1.3.12.2.1107.5.2.19.45294.2014031112031074889450815' }
            })
            .expect(200)
            .end(function(err, res)  {
                if(err) { 
                    console.dir(res);
                    throw err;
                }
                //TODO - should validate the returned content?
                done();
            });
        });
        it('searching by bodypart', function(done) {
            request(app).get('/api/query/find')
            .query({
                select: 'id headers.BodyPartExamined', 
                where: {'headers.BodyPartExamined': 'BRAIN' }
            })
            .expect(200)
            .end(function(err, res)  {
                if(err) { 
                    console.dir(res);
                    throw err;
                }
            
                console.log("returned recs:"+res.body.length);
                //TODO - should validate the returned content?
                done();
            });
        });

    });
});

describe('model', function() {
    var User = require('../models/user.js').User;
    before(function(done) {
        //console.log("removing testuser");
        User.remove({"local.username": 'testuser'}, done);

        /* create user..
        var soichi = new User({
            local: {username: "soichih"},
            profile: {email: "soichih@gmail.com"}
        });
        soichi.setPassword("...........");
        soichi.save();
        */

        /* update password..
        User.findOne({"local.username": "soichih"}, function(err, user) {
            if(err) return done(err);
            user.setPassword("...............", function(err) {
                if(err) return done(err);
                user.save(function(err, user) {
                    if(err) return done(err);
                    //console.dir(user);
                    done();
                });
            });
        });
        */

        /*
        //update record
        User.findOne({"local.username": "soichih"}, function(err, user) {
            if(err) return done(err);
            user.profile.fullname = "Soichi Hayashi";
            user.profile.nickname = "Soichi";
            user.scopes = {dicom: ['admin', 'project_a']};
            user.save(function(err, user) {
                if(err) return done(err);
                //console.dir(user);
                done();
            });
        });
        */

    });

    describe('user', function() {
        it('create user', function(done) {
            var user = new User({
                local: {username: "testuser"},
                profile: {email: "testuser@email.com"},
            });
            user.save(function(err, rec) {
                if(err) return done(err);
                //console.log("done saving");
                //console.dir(rec);
                User.findOne({"profile.email": 'testuser@email.com'}, function(err, users) {
                    if(!users) {
                        return done(new Error("can't find the user created "));
                    }
                    if(users.local.username != "testuser") {
                        return done(new Error("user ID doesn't match"));
                    }
                    done();//all good
                });
            });
        });
        /*
        it('request invite', function(done) {
            User.requestInvite("test@email.com", function(err) {
                if(err) throw err;
                User.findOne({emails: 'test@email.com'}, function(err, users) {
                    if(!users) {
                        return done(new Error("can't find the invitation record"));
                    }
                    if(users.emails[0] != "test@email.com") {
                        return done(new Error("email doesn't match"));
                    }
                    done();//all good
                });
            });
        });
        */
        /* already done
        it('find record', function(done) {
            User.findOne({email: 'test@email.com'}, function(err, users) {
                if(err) throw err;
                //console.dir(users);
                //TODO - validate
                done();
            });
        });
        */
    });
});

/*
describe('etl', function(){
    var etl = require('../etl');
    describe('load', function(){
        it('try loading', function(done){
            etl.upsert('/var/data/phantom-data/MRI_Skyra/CQIE_PHANTOM_TEST_ACR_20140325_075633742/MR.1.3.12.2.1107.5.2.19.45294.2014030709502017884128865.dcm.headers.json', done);
        })
    })
});
*/

after(function(done) {
    mongoose.disconnect(done);
});

