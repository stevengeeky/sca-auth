'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

var controllers = angular.module('authControllers', [
    'ui.bootstrap',
]);

controllers.controller('LoginController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location, redirector) {

    //var $redirect = $routeParams.redirect ? $routeParams.redirect : "#/user";
    //allow caller to specify redirect url via ?redirect param

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
        $cookies.remove("messages", {path: "/"}); //TODO - without path, it tries to remove cookie under /auth path not find it
    }

    $scope.userpass = {};
    $scope.submit = function() {
        //console.dir($scope.userpass);
        $http.post(appconf.api+'/local/auth', $scope.userpass)
        .success(function(data, status, headers, config) {
            localStorage.setItem(appconf.jwt_id, data.jwt);
            if(!redirector.go()) {
                toaster.success(data.message);
            }
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        }); 
    }

    $scope.begin_iucas = function() {
        //IU cas doesn't let us login via Ajax...
        var casurl = appconf.api+'/iucas';
        window.location = "https://cas.iu.edu/cas/login?cassvc=IU&casurl="+casurl;
        /*
        //var url = "https://cas.iu.edu/cas/login?cassvc=IU&casurl="+encodeURIComponent(window.location+'#/iucas-success');
        var url = "https://cas.iu.edu/cas/login?cassvc=IU&casurl="+encodeURIComponent(document.location+'#/iucas-next');
        console.log("redirecting to "+url);
        window.location = url;
        */
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

controllers.controller('RegisterController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location, redirector) {
    $scope.alerts = [];

    //stores form
    $scope.form = {};

    $scope.submit = function() {
        $http.post(appconf.api+'/register', $scope.form)
        .success(function(data, status, headers, config) {
            localStorage.setItem(appconf.jwt_id, data.jwt);
            if(!redirector.go()) {
                toaster.success(data.message);
            }
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });         
    }
}]);

//only used by iucas? if so, I should change the name. if not, I should make this a service
controllers.controller('SuccessController', ['$scope', 'appconf', '$route', '$routeParams', 'toaster', '$http', 'jwtHelper', '$location', '$window', 'redirector', 
function($scope, appconf, $route, $routeParams, toaster, $http, jwtHelper, $location, $window, redirector) {
    if($routeParams.jwt) {
        console.log("received jwt:"+$routeParams.jwt);
        localStorage.setItem(appconf.jwt_id, $routeParams.jwt);
        //no need to do this because we are directing to somewhere else anyway
        //also, modifying the $location.search causes this controller to fire twice.
        //$location.search('jwt', null); //remove jwt from url (just to hide it from the user..)
    }
    redirector.go();
}]);

/*
controllers.controller('IUCASSuccessController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location, redirector) {
    console.log("IUCASSuccess");
    console.dir($routeParams);
}]);
*/
