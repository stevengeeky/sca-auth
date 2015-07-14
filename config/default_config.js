//these are the default config. don't edit this!
//extend config.js from this config and update it instead

exports.config = {
    mongodb: "mongodb://localhost/auth",

    //must match with casurl passed to cas.iu.edu/login service
    casurl: 'https://soichi7.ppa.iu.edu',

    //some params used to generate jwt
    jwt: {
        iss: "http://myapp.iu.edu/auth",
        ttl: 1000*3600*24*3, //3 days (should be sooner - or let user decide?)
        //ttl: 1000*3600, //1 hour
    }

    /*
    path_prefix: '/auth',

    post_success: '/post_success', //url to redirect after successful authentication
    post_logout: '/post_logout', //url to redirect after logout
    post_confirmation: 'http://example.com/iucas/profile', //url to redirect after email confirmation

    default_scopes: {common: ['user']}, //default scope that all new user will get

    iucas_fail: 'http://example.com/iucas/fail', //url to redirect after authentication failurer from iucas
    
    //where we set the jwt token once issued
    cookie: { 
        jwt_name: 'jwt',
        refresh_jwt_name: 'jwt_refresh',
    },
    */
    
};
