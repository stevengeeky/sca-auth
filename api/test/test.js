
//contrib
var request = require('supertest')
var assert = require('assert');

//mine
var config = require('../config');
var db = require('../models');
var app = require('../server').app;

process.env.DEBUG="*";

before(function(done) {
    done();
});

/*
describe('/query', function() {
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
    before(function(done) {
        //console.log("removing testuser");
        db.User.remove({"local.username": 'testuser'}, done);

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
    });
});
*/
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

