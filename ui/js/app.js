'use strict';

var app = angular.module('app', [
    'app.config',
    'ngSanitize',
    'ngRoute',
    'ngAnimate',
    'ngCookies',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'authControllers' //contains searchControllers - others?
]);

/*
app.config(['appconf', '$httpProvider', 'jwtInterceptorProvider', function(appconf, $httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.tokenGetter = [function(myService) {
        //console.dir(localStorage.getItem(appconf.jwt_token_id));
        return localStorage.getItem(appconf.jwt_token_id);
    }];
    $httpProvider.interceptors.push('jwtInterceptor');
}]);
*/
/*
app.factory('jwt', ['appconf', '$cookies', 'jwtHelper', function(appconf, $cookies, jwtHelper) {
    var jwt_cookie = $cookies.get('jwt');
    if(jwt_cookie) {
        var jwt = jwtHelper.decodeToken(jwt_cookie);
        return jwt;
    } else {
        //not authenticated
        return null;
    }
}]);
*/

//use this service if you want to keep renewing jwt
app.factory('jwt_refresher', ['appconf', '$http', 'toaster', 'jwtHelper', function(appconf, $http, toaster, jwtHelper) {
    var refresher = setInterval(function() {
        var jwt = localStorage.getItem('jwt');
        if(jwt) {
            console.log("renewing jwt");
            $http.get(appconf.api+'/refresh')
            .success(function(data, status, headers, config) {
                localStorage.setItem(appconf.jwt_id, data.jwt);
                
                //debug
                var token = jwtHelper.decodeToken(data.jwt);
                console.log(token);
            })
            .error(function(data, status, headers, config) {
                toaster.error(data.message);
            }); 
        }
    }, 1000*60); //every minutes?
    return refresher;
}]);

app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
}]);

//configure route
app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
    when('/login', {
        templateUrl: 't/login.html',
        controller: 'LoginController'
    })
    
    //callback after successful login (take ?jwt= and set it to localstorage)
    .when('/success', {
        templateUrl: 't/empty.html',
        controller: 'SuccessController'
    })
    .when('/resetpass', {
        templateUrl: 't/resetpass.html',
        controller: 'ResetpassController'
    })
    .when('/register', {
        templateUrl: 't/register.html',
        controller: 'RegisterController'
    })
    .when('/user', {
        templateUrl: 't/user.html',
        controller: 'UserController'
    })
   /*
    when('/admin', {
        templateUrl: 'admin.html',
        controller: 'AdminController'
    }).
    when('/settings', {
        templateUrl: 'settings.html',
        controller: 'SettingsController'
    }).
    */
    .otherwise({
        //TODO - redirect to correct page based on jwt
        redirectTo: '/login'
    });
}]);

//configure httpProvider to send jwt unless skipAuthorization is set in config (not tested yet..)
app.config(['appconf', '$httpProvider', 'jwtInterceptorProvider', 
function(appconf, $httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.tokenGetter = function(config) {
        //if(config.nojwt) return null;
        /*
        if (config.url.indexOf('http://auth0.com') === 0) {
            return localStorage.getItem('auth0.id_token');
        } else {
            return localStorage.getItem('id_token');
        }
        */
        return localStorage.getItem('jwt');
    }
    $httpProvider.interceptors.push('jwtInterceptor');

}]);


