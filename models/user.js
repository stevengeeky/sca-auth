var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var userSchema = mongoose.Schema({
    //_id is used as jwt's sub

    //for local authentication
    local: {
        username: { type: String, index: {unique: true} }, 
        password_hash: String, //bcrypt-ed password

        email: { type: String, index: {unique: true} },  //email needs to be unique 
        email_confirmed: { type: Boolean, default: false }
    },

    //for iucas authentication
    iucas: {
        id: { type: String, index: {unique: true} } //IU ID
    },

    //user profile
    profile: {
        fullname: String,
        nickname: String //usually user's first name.. just to show in various places
    },

    /* -- going to move this to a separate collection (or even a separate service?)
    invitation: {      
        date: { type: Date }, //date when the account invitation was sent
        token: String, //invitation token that user can use to register
    },

    registration: {
        date: { type: Date } //date when this user has registered
        token: String, //registation token used to confirm the account
        confirmation_date: Date //date of email confirmation
    },
    */

    login_date: Date, //date when the user last logged in
    signup_date: { type: Date, default: Date.now }, //date when the user signed up

    //user account can be deactivated (temporarily?) by administrator
    active: { type: Boolean, default: true },

    //access granted to this user
    scopes: mongoose.Schema.Types.Mixed 
});

/////////////////////////////////////////////////////////////////////////
// 
// methods for record instance
//

//set bcrypted password on the record cb(err)
userSchema.methods.setPassword = function(password, cb) {
    /* cost of computation https://www.npmjs.com/package/bcrypt
    * rounds=10: ~10 hashes/sec
    * rounds=13: ~1 sec/hash
    * rounds=25: ~1 hour/hash
    * rounds=31: 2-3 days/hash
    */
    var rec = this;
    //console.log("creating saalt");
    bcrypt.genSalt(10, function(err, salt) {
        //console.dir(password);
        //console.dir(salt);
        bcrypt.hash(password, salt, function(err, hash) {
            if(err) return cb(err);
            //console.log(hash);
            rec.local.password_hash = hash;
            cb(null);
        });
    });
}

userSchema.methods.isPasswordMatch = function(password) {
    return bcrypt.compareSync(password, this.local.password_hash);
}

/////////////////////////////////////////////////////////////////////////
//
//guest can request for an invite
//

/*
userSchema.statics.requestInvite = function(email, cb) {
    this.find({email: email}, function(err, users) {
        if(users.length != 0) {
            cb(new Error("requested email address already exists")); 
        } else {
            var user = new User({email: [email]});
            user.save(cb);
        }
    });
}
*/

userSchema.statics.createToken = function(user) {
    var today = Math.round(Date.now()/1000);
    var expiration = today+3600*24*7; //7days

    //http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html#RegisteredClaimName
    var token = {
        iss: "http://trident.iu.edu", //issuer
        exp: expiration,
        scopes: []
    };
    if(user) {
        token.sub = user._id;
        //token.name = user.fullname;
        token.scopes = user.scopes;
    }
    return token;
}

var User = mongoose.model('User', userSchema);
exports.User = User;

