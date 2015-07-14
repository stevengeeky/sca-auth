'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

var controllers = angular.module('authControllers', [
    'ui.bootstrap',
]);

controllers.controller('LoginController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location) {
    var $redirect = $routeParams.redirect ? $routeParams.redirect : "#/user";
    localStorage.setItem('post_auth_redirect', $redirect);

    $scope.title = appconf.title;
    $scope.logo_400_url = appconf.logo_400_url;
    //console.dir(jwt);
    //toaster.pop('error', 'title', 'Hello there');
    //toaster.pop('success', 'title', 'Hello there');
    //toaster.pop('wait', 'title', 'Hello there');
    //toaster.pop('warning', 'title', 'Hello there');
    //toaster.pop('note', 'title', 'Hello there');
    //toaster.success('title', 'Hello there');
    //toaster.error('title', 'Hello there');

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt != null && !jwtHelper.isTokenExpired(jwt)) {
        toaster.pop('note', 'You are already logged in');
        //DEBUG
        var token = jwtHelper.decodeToken(jwt);
        console.log(token);
    }

    //sometime we get error messages via cookie (like iucas registration failurer)
    var messages = $cookies.get("messages");
    if(messages) {
        JSON.parse(messages).forEach(function(message) {
            toaster.pop(message.type, message.title, message.message);
        });
        $cookies.remove("messages", {path: "/"}); //TODO - without path, it tries to remove cookie under /auth path not find it
    }

    $scope.userpass = {};
    $scope.submit = function() {
        //console.dir($scope.userpass);
        $http.post(appconf.api+'/local/auth', $scope.userpass)
        .success(function(data, status, headers, config) {
            toaster.success(data.message);
            localStorage.setItem(appconf.jwt_id, data.jwt);
            $location.path("/user");
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        }); 
    }

    $scope.begin_iucas = function() {
        //var casurl = document.location.origin+document.location.pathname;
        var casurl = appconf.api+'/iucas';
        //$cookies.put("casurl", casurl, {domain: ''}); //TODO -- will this break the security model?

        //IU cas doesn't let us login via Ajax...
        document.location = "https://cas.iu.edu/cas/login?cassvc=IU&casurl="+casurl;
    }

    $scope.test = function() {
        $http.get(appconf.api+'/verify')
        .success(function(data, status, headers, config) {
            toaster.success("You are logged in!");
            $scope.jwt_dump = JSON.stringify(data, null, 4);
            console.dir(data);
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        }); 
    }

    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == variable) {
                return decodeURIComponent(pair[1]);
            }
        }
        console.log('Query variable %s not found', variable);
    }
}]);

controllers.controller('RegisterController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location) {
    $scope.alerts = [];

    /*
    if($routeParams.register_token) {
        var tokenPayload = jwtHelper.decodeToken($routeParams.register_token);
        //console.dir(tokenPayload);
        if(tokenPayload.casid) {
            $scope.alerts.push({type: 'info', msg: 'Looks like this is your first time logging in with your IU CAS ID. Please register your username and password in order to setup your new account.'});
        }
    }
    */

    //stores form
    $scope.form = {};

    $scope.submit = function() {
        $http.post(appconf.api+'/register', $scope.form)
        .success(function(data, status, headers, config) {
            /*
            if(data.exist) {
                $scope.alerts.push({type: 'warning', msg: 'The username specified is already registered. Please try a different username, or if you have already registered, please login first.'});
            } else {
                //TODO 
            }
            */
            toaster.success(data.message);
            localStorage.setItem(appconf.jwt_id, data.jwt);
            $location.path("/user");
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });         
        //console.dir($scope.useremail);
    }
}]);

controllers.controller('UserController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', //'jwt_refresher',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies/*, jwt_refresher*/) {
    $scope.form_profile  = null; //to be loaded later

    $http.get(appconf.api+'/user/profile')
    .success(function(profile, status, headers, config) {
        //console.dir(profile);
        $scope.form_profile  = profile;
    })
    .error(function(data, status, headers, config) {
        if(data && data.message) {
            toaster.error(data.message);
        }
    }); 
    $scope.submit_profile = function() {
        $http.post(appconf.api+'/user/profile', $scope.form_profile)
        .success(function(data, status, headers, config) {
            toaster.success(data.message);
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });         
    }
}]);

//only used by iucas? if so, I should change the name. if not, I should make this a service
controllers.controller('SuccessController', ['$scope', 'appconf', '$route', '$routeParams', 'toaster', '$http', 'jwtHelper', '$location', '$window',
function($scope, appconf, $route, $routeParams, toaster, $http, jwtHelper, $location, $window) {
    //var exp_date = jwtHelper.getTokenExpirationDate(token);
    if($routeParams.jwt) {
        console.log("received jwt:"+$routeParams.jwt);
        localStorage.setItem(appconf.jwt_id, $routeParams.jwt);
        $location.search('jwt', null); //remove jwt from url (just to hide it from the user..)
        //var token = jwtHelper.decodeToken($routeParams.jwt);
        //console.dir(token);
    }
    
    //TODO redirect to ?redirect URL if set by client
    var redirect = localStorage.getItem('post_auth_redirect');
    if(redirect) {
        console.log("redirecting to "+redirect);
        localStorage.removeItem('post_auth_redirect');
        //$location.path(redirect); //this won't work for external redirect?
        //document.location=redirect; //but I think this won't work for internal?
        //$location.url(redirect); //doesn't work either
        $window.location.href = redirect;
    } /*else {
        toaster.success('Login Success!');
        $location.path("/user");
    }*/
}]);

/*
controllers.controller('TopmenuController', ['$scope', 'appconf', 
function($scope, appconf, jwt, $route) {
    $scope.title = appconf.title;
    //TODO - load stuff from various services (like auth)
}]);

controllers.controller('NavController', ['$scope', 'appconf', 'jwt', '$route',
function($scope, appconf, jwt, $route) {
    var menu = [];
    menu.push({label: "Search", url: "#/search"});
    menu.push({label: "Visualize", url: "#/visualize"});
    menu.push({label: "Settings", url: "#/settings"});
    menu.push({label: "Admin", url: "#/admin"});
    $scope.menu = menu;
}]);
*/


