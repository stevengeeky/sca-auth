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

/*
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
*/

//show loading bar at the top
app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
}]);

//configure route
app.config(['$routeProvider', 'appconf', function($routeProvider, appconf) {
    $routeProvider.
    when('/login', {
        templateUrl: 't/login.html',
        controller: 'LoginController'
    })
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
        controller: 'UserController',
        requiresLogin: true
    })
    .otherwise({
        redirectTo: '/login'
    });
    
    //console.dir($routeProvider);
}]).run(['$rootScope', '$location', 'toaster', 'jwtHelper', 'appconf', function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        console.log("route changed from "+current+" to :"+next);
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                toaster.warning("Please login first");
                localStorage.setItem('post_auth_redirect', next.originalPath);
                $location.path("/login");
                event.preventDefault();
            }
        }
    });
}]);

//configure httpProvider to send jwt unless skipAuthorization is set in config (not tested yet..)
app.config(['appconf', '$httpProvider', 'jwtInterceptorProvider', 
function(appconf, $httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.tokenGetter = function(jwtHelper, config, $http) {

        //don't send jwt for template requests
        if (config.url.substr(config.url.length - 5) == '.html') {
            return null;
        }
        //if(config.nojwt) return null;
        /*
        if (config.url.indexOf('http://auth0.com') === 0) {
            return localStorage.getItem('auth0.id_token');
        } else {
            return localStorage.getItem('id_token');
        }
        */
        var jwt = localStorage.getItem(appconf.jwt_id);
        var expdate = jwtHelper.getTokenExpirationDate(jwt);
        var ttl = expdate - Date.now();
        if(ttl < 3600*1000) {
            console.dir(config);
            console.log("jwt expiring in an hour.. refreshing first");
            //jwt expring in less than an hour! refresh!
            return $http({
                url: appconf.api+'/refresh',
                skipAuthorization: true,  //prevent infinite recursion
                headers: {'Authorization': 'Bearer '+jwt},
                method: 'POST'
            }).then(function(response) {
                var jwt = response.data.jwt;
                //console.log("got renewed jwt:"+jwt);
                localStorage.setItem(appconf.jwt_id, jwt);
                return jwt;
            });
        }
        return jwt;
    }
    $httpProvider.interceptors.push('jwtInterceptor');
}]);


