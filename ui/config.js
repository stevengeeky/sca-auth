'use strict';

//this is checked in to git as default
//nothing sensitive should go here (since it will be published via web server anyway)

angular.module('app.config', [])
//constant *service*
.constant('appconf', {
    title: 'Authentication Service',
    admin_email: 'hayashis@iu.edu',
    logo_400_url: 'images/soichidev.jpg',
    //logo_400_url: 'images/meshconfig_logo.jpg',

    //URL for auth service API
    api: '../api/auth',

    //shared servive api and ui urls (for menus and stuff)
    shared_api: '../api/shared',
    shared_url: '../shared',

    profile_api: '../api/profile',

    //default location to redirect after successful login
    default_redirect_url: '../profile', 
    //default_redirect_url: '#/welcome',

    jwt_id: 'jwt',
    iucas_url: 'https://cas.iu.edu/cas/login',
});

