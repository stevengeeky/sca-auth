'use strict';

//this is checked in to git as default
//nothing sensitive should go here (since it will be published via web server anyway)

angular.module('app.config', [])
//constant *service*
.constant('appconf', {
    title: 'Authentication Service',
    admin_email: 'hayashis@iu.edu',
    logo_400_url: 'images/sample.jpg',
    version: '0.0.1',

    //URL for auth service API
    api: 'https://soichi7.ppa.iu.edu/api/auth',

    //default location to redirect after successful login
    default_redirect_url: 'https://soichi7.ppa.iu.edu/profile', 

    jwt_id: 'jwt'
});

