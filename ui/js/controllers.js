'use strict';

//just a service to load all users from auth service
app.factory('serverconf', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    return $http.get(appconf.api+'/config')
    .then(function(res) {
        return res.data;
    });
}]);

app.factory('profile', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    var jwt = localStorage.getItem(appconf.jwt_id);
    var user = jwtHelper.decodeToken(jwt);
    var pub = {fullname: null};

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

//load menu and profile by promise chaining
//http://www.codelord.net/2015/09/24/$q-dot-defer-youre-doing-it-wrong/
//https://www.airpair.com/angularjs/posts/angularjs-promises
//TODO - /menu/top and /menu/settings should loaded simultanously.. and somehow resolve when both are loaded
app.factory('menu', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    var menu = {};
    return $http.get(appconf.shared_api+'/menu/top').then(function(res) {
        menu.top = res.data;
        
        //then load user profile (if we have jwt)
        var jwt = localStorage.getItem(appconf.jwt_id);
        if(!jwt)  return menu;
        var user = jwtHelper.decodeToken(jwt);
        //TODO - jwt could be invalid 
        return $http.get(appconf.profile_api+'/public/'+user.sub);
    }, function(err) {
        console.log("failed to load menu");
    }).then(function(res) {
        //TODO - this function is called with either valid profile, or just menu if jwt is not provided... only do following if res is profile
        //if(res.status != 200) return $q.reject("Failed to load profile");
        menu._profile = res.data;
        return $http.get(appconf.shared_api+'/menu/settings').then(function(res) {
            menu.settings = res.data;
            return menu;
        });
    }, function(err) {
        console.log("couldn't load profile");
    });
}]);

/*
app.directive('compareTo', function() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function(scope, element, attributes, ngModel) {
            ngModel.$validators.compareTo = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };
            scope.$watch("otherModelValue", function() {
                ngModel.$validate();
            });
        }
    };
});
*/

app.controller('SigninController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', '$location', 'scaMessage', '$sce',
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, $location, scaMessage, $sce) {

    $scope.title = appconf.title;
    $scope.logo_400_url = appconf.logo_400_url;
    scaMessage.show(toaster);

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt != null && !jwtHelper.isTokenExpired(jwt)) {
        toaster.pop({type: 'note', body: 'You are already signed in. <a href="#/signout">Click here to Sign out</a>', bodyOutputType: 'trustedHtml'});
        //DEBUG
        var token = jwtHelper.decodeToken(jwt);
        //console.log(token);
    }

    //decide where to go after auth
    var redirect = sessionStorage.getItem('auth_redirect');
    //TODO - try if user sent us redirect url via query param?
    if(!redirect) redirect = document.referrer;
    if(!redirect) redirect = appconf.default_redirect_url;
    sessionStorage.setItem('auth_redirect', redirect); //save it for iucas login which needs this later

    $scope.userpass = {};
    $scope.submit = function() {
        //console.dir($scope.userpass);
        $http.post(appconf.api+'/local/auth', $scope.userpass)
        .success(function(data, status, headers, config) {
            scaMessage.success(data.message);
            localStorage.setItem(appconf.jwt_id, data.jwt);
            sessionStorage.removeItem('auth_redirect');
            document.location = redirect;
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        }); 
    }

    $scope.begin_iucas = function() {
        //I can't pass # for callback somehow (I don't know how to make it work, or iucas removes it)
        //so let's let another html page handle the callback, do the token validation through iucas and generate the jwt 
        //and either redirect to profile page (default) or force user to setup user/pass if it's brand new user
        var casurl = window.location.origin+window.location.pathname+'iucascb.html';
        window.location.href = appconf.iucas_url+'?cassvc=IU&casurl='+casurl;
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

app.controller('SignoutController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', 
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams) {
    localStorage.removeItem(appconf.jwt_id);
    toaster.success("Good Bye!");
    //$location.path("/signin");
    window.location = "#/signin";
}]);

app.controller('SignupController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', 'scaMessage', 
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, scaMessage) {
    scaMessage.show(toaster);
    //$scope.alerts = [];

    //stores form
    $scope.form = {};

    //decide where to go after signup
    var redirect = sessionStorage.getItem('auth_redirect');
    if(!redirect) redirect = document.referrer;
    if(!redirect) redirect = appconf.default_redirect_url;

    $scope.submit = function() {
        $http.post(appconf.api+'/signup', $scope.form)
        .success(function(data, status, headers, config) {
            localStorage.setItem(appconf.jwt_id, data.jwt);
                scaMessage.success("Successfully signed up!");
                sessionStorage.removeItem('auth_redirect');
                document.location = redirect;
        })
        .error(function(data, status, headers, config) {
            toaster.error(data.message);
        });         
    }
}]);

app.controller('SetpassController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', 'scaMessage',
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, scaMessage) {
    scaMessage.show(toaster);
    //$scope.alerts = [];

    //stores form
    $scope.form = {};

    $http.get(appconf.api+'/me')
    .success(function(data, status, headers, config) {
        $scope.form.username = data.username;
    })
    .error(function(data, status, headers, config) {
        toaster.error(data.message);
    }); 

    //decide where to go after setting password
    var redirect = sessionStorage.getItem('auth_redirect');
    if(!redirect) redirect = document.referrer;
    if(!redirect) redirect = appconf.default_redirect_url;

    $scope.submit = function() {
        $http.put(appconf.api+'/local/setpass', {password: $scope.form.password})
        .success(function(data, status, headers, config) {
            scaMessage.success("Successfully reset password!");
            sessionStorage.removeItem('auth_redirect');
            document.location = redirect;
        })
        .error(function(data, status, headers, config) {
            console.dir(data);
            toaster.error(data.message);
        });         
    }
}]);

app.controller('SettingsController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'profile', 'serverconf', 'menu', 'jwtHelper', 'scaMessage',
function($scope, appconf, $route, toaster, $http, profile, serverconf, menu, jwtHelper, scaMessage) {
    $scope.public_profile = profile.pub;
    $scope.user = null;
    $scope.form_password = {};
    $scope.password_strength = {};
    scaMessage.show(toaster);

    //for debug pane
    var jwt = localStorage.getItem(appconf.jwt_id);
    var token = jwtHelper.decodeToken(jwt);
    $scope.debug = {jwt: token};

    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    menu.then(function(_menu) { $scope.menu = _menu; });

    $scope.submit_password = function() {
        if($scope.form_password.new == $scope.form_password.new_confirm) {
            $http.put(appconf.api+'/local/setpass', {password_old: $scope.form_password.old, password: $scope.form_password.new})
            .success(function(data, status, headers, config) {
                var redirect = sessionStorage.getItem('auth_settings_redirect');
                if(redirect) {
                    scaMessage.success("Account settings updated successfully!");
                    sessionStorage.removeItem('auth_settings_redirect');
                    document.location = redirect;
                } else {
                    toaster.success(data.message);
                }
            })
            .error(function(data, status, headers, config) {
                toaster.error(data.message);
            });
        } else {
            console.log("password confirmation fail");
        }
    }
    $scope.disconnect = function(type) {
        $http.put(appconf.api+'/'+type+'/disconnect')
        .success(function(data) {
            toaster.success(data.message);
            switch(type) {
            case "iucas": delete $scope.user.iucas; break;
            case "git": delete $scope.user.gitid; break;
            case "google": delete $scope.user.googleid; break;
            }
        })
        .error(function(data) {
            toaster.error(data.message);
        });
    }
    $scope.iucas_connect = function() {
        //localStorage.setItem('post_auth_redirect', window.location.href);
        //scaRedirector.push(window.location.href);
        var casurl = window.location.origin+window.location.pathname+'iucascb.html';
        window.location = appconf.iucas_url+'?cassvc=IU&casurl='+casurl;
    }
    $scope.git_connect = function() {
        toaster.info("git_connect todo");
    }
    $scope.google_connect = function() {
        toaster.info("google_connect todo");
    }

    $scope.$watch('form_password.new', function(newv, oldv) {
        if(newv) {
            //gather strings that we don't want user to use as password (like user's own fullname, etc..)
            var used = [];
            if($scope.public_profile) used.push($scope.public_profile.fullname);
            if($scope.user) { 
                used.push($scope.user.username);
                used.push($scope.user.email);
            }
            //https://blogs.dropbox.com/tech/2012/04/zxcvbn-realistic-password-strength-estimation/
            var st = zxcvbn(newv, used);
            $scope.password_strength = st;
        }
    });
    
    //load user info
    $http.get(appconf.api+'/me')
    .success(function(info) {
        $scope.user = info;
    });
}]);

app.controller('ForgotpassController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', '$location', 'scaMessage', 
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, $location, scaMessage) {
    scaMessage.show(toaster);
    //TODO
}]);

