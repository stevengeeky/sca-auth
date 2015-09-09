(function() {
'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

var controllers = angular.module('authControllers', [
    'ui.bootstrap',
]);

controllers.factory('profile', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    var jwt = localStorage.getItem(appconf.jwt_id);
    var user = jwtHelper.decodeToken(jwt);

    var pub = {fullname: "Soichi"};

    $http.get(appconf.profile_api+'/public/'+user.sub)
    .success(function(profile, status, headers, config) {
        for(var k in profile) {         
            pub[k] = profile[k]; 
        }
    });

    return {
        pub: pub,
    }
}]);

controllers.controller('SigninController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
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
        //why path="/"? Without it, it tries to remove cookie under just /auth path and not find messges
        //that comes from other apps. (make sure to set cookie under "/" on your other apps)
        $cookies.remove("messages", {path: "/"}); 
    }

    $scope.userpass = {};
    $scope.submit = function() {
        //console.dir($scope.userpass);
        $http.post(appconf.api+'/local/auth', $scope.userpass)
        .success(function(data, status, headers, config) {
            localStorage.setItem(appconf.jwt_id, data.jwt);
            //TODO - how should I forward success message?
            if(!redirector.go()) {
                toaster.success(data.message);
            }
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        }); 
    }

    $scope.begin_iucas = function() {
        //I can't pass # for callback somehow (I don't know how to make it work, or iucas removes it)
        //so let's let another html page handle the callback, do the token validation through iucas and generate the jwt 
        //and either redirect to profile page (default) or force user to setup user/pass if it's brand new user
        var casurl = 'https://soichi7.ppa.iu.edu/auth/iucascb.html';
        window.location = "https://cas.iu.edu/cas/login?cassvc=IU&casurl="+casurl;
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

controllers.controller('SignoutController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location, redirector) {
    localStorage.removeItem(appconf.jwt_id);
    $location.path("/signin");
    toaster.success("Good Bye!");
}]);

controllers.controller('SignupController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location, redirector) {
    $scope.alerts = [];

    //stores form
    $scope.form = {};

    $scope.submit = function() {
        $http.post(appconf.api+'/singup', $scope.form)
        .success(function(data, status, headers, config) {
            localStorage.setItem(appconf.jwt_id, data.jwt);
            //TODO - how should I forward success message?
            if(!redirector.go()) {
                toaster.success(data.message);
            }
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });         
    }
}]);

controllers.controller('SetpassController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 'redirector',
function($scope, appconf, $route, toaster, $http, jwtHelper, $cookies, $routeParams, $location, redirector) {
    $scope.alerts = [];

    //stores form
    $scope.form = {};

    $http.get(appconf.api+'/local/me')
    .success(function(data, status, headers, config) {
        $scope.form.username = data.username;
    })
    .error(function(data, status, headers, config) {
        toaster.error(data.message);
    }); 

    $scope.submit = function() {
        $http.put(appconf.api+'/local/setpass', {password: $scope.form.password})
        .success(function(data, status, headers, config) {
            //localStorage.setItem(appconf.jwt_id, data.jwt);
            //TODO - how should I forward success message?
            if(!redirector.go()) {
                toaster.success(data.message);
            }
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });         
    }
}]);

/*
//right now, this is only used by IUCAS only. 
controllers.controller('ReceiveJWTController', ['$scope', 'appconf', '$route', '$routeParams', 'toaster', '$http', 'jwtHelper', '$location', '$window', 'redirector', 
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
*/
app.controller('SettingsController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'profile',
function($scope, appconf, $route, toaster, $http, profile) {
    $scope.public_profile = profile.pub;
    /*
    $scope.form_account = null; 

    $http.get(appconf.api+'/settings')
    .success(function(profile, status, headers, config) {
        $scope.form_profile  = profile;
    })
    .error(function(data, status, headers, config) {
        if(data && data.message) {
            toaster.error(data.message);
        }
    });
    $scope.submit_profile = function() {
        $http.put(appconf.api+'/public', $scope.form_profile)
        .success(function(data, status, headers, config) {
            toaster.success(data.message);
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });
    }
    */

    //load menu
    $http.get(appconf.shared_api+'/menu')
    .success(function(menu) {
        $scope.menu = menu;
        menu.forEach(function(m) {
            switch(m.id) {
            case 'top':
                $scope.top_menu = m;
                break;
            case 'topright':
                $scope.topright_menu = m;
                break;
            case 'settings':
                $scope.settings_menu = m;
                break;
            }
        });
    });
}]);



})(); //scope barrier
