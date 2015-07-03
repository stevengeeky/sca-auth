'use strict';

angular.module('app.config', [])
//constant *service*
.constant('appconf', {
    title: 'Authentication Service',
    logo_400_url: 'images/sample.jpg',
    version: '0.0.1',
    api: 'https://soichi7.ppa.iu.edu/api/auth',
    jwt_id: 'jwt'
});

