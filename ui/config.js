'use strict';

//this is checked in to git as default
//nothing sensitive should go here (since it will be published via web server anyway)

angular.module('app.config', [])
//constant *service*
.constant('appconf', {
    title: 'Authentication Service',
    admin_email: 'hayashis@iu.edu',
    logo_400_url: 'images/sample.jpg',
    //logo_400_url: 'images/meshconfig_logo.jpg',
    version: '0.0.1',

    //URL for auth service API
    api: 'https://soichi7.ppa.iu.edu/api/auth',

    //shared servive api and ui urls (for menus and stuff)
    shared_api: 'https://soichi7.ppa.iu.edu/api/shared',
    shared_url: 'https://soichi7.ppa.iu.edu/shared',

    profile_api: 'https://soichi7.ppa.iu.edu/api/profile',

    //default location to redirect after successful login
    default_redirect_url: 'https://soichi7.ppa.iu.edu/profile', 
    //default_redirect_url: '#/welcome',

    jwt_id: 'jwt'
});

