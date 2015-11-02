'use strict';

var app = angular.module('app', [
    'app.config',
    'ngRoute',
    'ngAnimate',
    'ngCookies',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'ui.bootstrap',
    'sca-shared',
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

/*replaced by scaRedirector
//redirecto to whevever user needs to go after auccessful login
app.factory('redirector', ['$location', '$routeParams', 'appconf', 
function($location, $routeParams, appconf) {
    if(!localStorage.getItem('post_auth_redirect')) {
        if($routeParams.redirect) {
            localStorage.setItem('post_auth_redirect', $routeParams.redirect);
        } else if(document.referrer) {
            console.log("referrer set to "+document.referrer);
            localStorage.setItem('post_auth_redirect', document.referrer);
        } else {
            //last resort.. just forward some preconfigured location
            localStorage.setItem('post_auth_redirect', appconf.default_redirect_url);
        }
    }

    return {
        //redirect to specified url
        //returns true if redirecting out of the page
        go: function() {
            var redirect = localStorage.getItem('post_auth_redirect');
            localStorage.removeItem('post_auth_redirect');
            window.location = redirect;

            //if url starts with #, then it's internal redirect
            if(redirect[0] == "#") return false;
            return true;
        }
    }
}]);
*/

/*
app.factory('cookie2toaster', ['$cookies', 'toaster', function($cookies, toaster) {
    //sometime we get error messages via cookie (like iucas registration failurer)
    var messages = $cookies.get("messages");
    if(messages) {
        JSON.parse(messages).forEach(function(message) {
            if(message.type == "error") {
                //make it sticky (show close button and no-timeout)
                toaster.pop({
                    type: message.type, 
                    title: message.title, 
                    body: message.message, 
                    showCloseButton: true, timeout: 0
                });
            } else {
                toaster.pop(message.type, message.title, message.message);
            }
        });
        //why path="/"? Without it, it tries to remove cookie under just /auth path and not find messges
        //that comes from other apps. (make sure to set cookie under "/" on your other apps)
        $cookies.remove("messages", {path: "/"}); 
    }
    return null;
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
    when('/signin', {
        templateUrl: 't/signin.html',
        controller: 'SigninController'
    })
    .when('/signout', {
        templateUrl: 't/signout.html',
        controller: 'SignoutController'
    })
    .when('/setpass', {
        templateUrl: 't/setpass.html',
        controller: 'SetpassController',
        requiresLogin: true
    })
    /*
    .when('/success', {
        templateUrl: 't/empty.html',
        controller: 'SuccessController'
    })
    */
    .when('/forgotpass', {
        templateUrl: 't/forgotpass.html',
        controller: 'ForgotpassController'
    })
    .when('/signup', {
        templateUrl: 't/signup.html',
        controller: 'SignupController'
    })
    .when('/settings', {
        templateUrl: 't/settings.html',
        controller: 'SettingsController',
        requiresLogin: true
    })
    /*
    .when('/debug', {
        templateUrl: 't/debug.html',
        controller: 'DebugController',
        requiresLogin: true
    })
    */
    .otherwise({
        redirectTo: '/signin'
    });
    
    //console.dir($routeProvider);
}]).run(['$rootScope', '$location', 'toaster', 'jwtHelper', 'appconf', function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        //console.log("route changed from "+current+" to :"+next);
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                toaster.warning("Please singin first");
                sessionStorage.setItem('auth_redirect', '#'+next.originalPath);
                $location.path("/signin");
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
        var jwt = localStorage.getItem(appconf.jwt_id);
        if(!jwt) return null; //not jwt
        var expdate = jwtHelper.getTokenExpirationDate(jwt);
        var ttl = expdate - Date.now();
        if(ttl < 0) {
            console.log("jwt expired");
            return null;
        } else if(ttl < 3600*1000) {
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


