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

app.controller('HeaderController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'serverconf', 'menu',
function($scope, appconf, $route, toaster, $http, serverconf, menu) {
    $scope.title = appconf.title;
    serverconf.then(function(_c) { $scope.serverconf = _c; });
    //menu.then(function(_menu) { $scope.menu = _menu; });
    $scope.menu = menu;
}]);

/*
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
*/
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

app.controller('SigninController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', '$location', 'scaMessage', '$sce', 'serverconf',
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, $location, scaMessage, $sce, serverconf) {
    $scope.$parent.active_menu = 'signin';
    $scope.title = appconf.title;
    serverconf.then(function(_c) { $scope.serverconf = _c; });
    $scope.logo_400_url = appconf.logo_400_url;
    scaMessage.show(toaster);

    /*
    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt != null && !jwtHelper.isTokenExpired(jwt)) {
        toaster.pop({
            type: 'note', 
            body: 'You are already signed in. <a href="#/signout">Click here to Sign out</a>', 
            bodyOutputType: 'trustedHtml'
        });
    }
    */

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
        .then(function(res) {
            scaMessage.success(res.data.message);
            localStorage.setItem(appconf.jwt_id, res.data.jwt);
            sessionStorage.removeItem('auth_redirect');
            document.location = redirect;
        }, function(res) {
            toaster.error(res.data.message);
        }); 
    }

    $scope.begin_iucas = function() {
        //I can't pass # for callback somehow (I don't know how to make it work, or iucas removes it)
        //so let's let another html page handle the callback, do the token validation through iucas and generate the jwt 
        //and either redirect to profile page (default) or force user to setup user/pass if it's brand new user
        var casurl = window.location.origin+window.location.pathname+'iucascb.html';
        window.location.href = appconf.iucas_url+'?cassvc=IU&casurl='+casurl;
    }

    $scope.begin_x509 = function() {
        /*
        var iframe = document.createElement('iframe');
        iframe.src = appconf.x509api+'/x509/auth';
        iframe.style.display = 'none';
        document.body.appendChild(iframe); //without this, iframe page won't be parsed
        */

        //var jwt = localStorage.getItem(appconf.jwt_id);
        //$http.get(appconf.x509api+'/x509/auth', {headers: { 'Authorization': 'Bearer '+jwt, }})
        $http.get(appconf.x509api+'/x509/auth') //, {headers: null})
        .then(function(res) {
            scaMessage.success("Welcome back!");
            localStorage.setItem(appconf.jwt_id, res.data.jwt);
            var redirect = sessionStorage.getItem('auth_redirect');
            window.location = redirect; 
            /*
            if(res.data.need_profile) {
                window.location = './#/complete';
            } else {
                var redirect = sessionStorage.getItem('auth_redirect');
                window.location = redirect; 
            }
            */
        }, function(res) {
            console.dir(res);
            toaster.error(res.data.message);
        }); 
    }

    /* I think this is no longer used (TODO confirm)
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
    */

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

app.controller('SignoutController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', 'menu',
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, menu) {
    localStorage.removeItem(appconf.jwt_id);
    toaster.success("Good Bye!");
    menu.user = null; //scaMenubar watches for this and re-init
    window.location = "#/signin";
    /*
    window.location = "#";
    location.reload();
    */
}]);

app.controller('SignupController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', 'scaMessage', 
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, scaMessage) {
    $scope.$parent.active_menu = 'signup';
    scaMessage.show(toaster);
    $scope.form = {};

    //decide where to go after signup
    var redirect = sessionStorage.getItem('auth_redirect');
    if(!redirect) redirect = document.referrer;
    if(!redirect) redirect = appconf.default_redirect_url;

    $scope.submit = function() {
        $http.post(appconf.api+'/signup', $scope.form)
        .then(function(res, status, headers, config) {
            localStorage.setItem(appconf.jwt_id, res.data.jwt);

            //let's post public profile for the first time
            $http.put(appconf.profile_api+'/public/'+res.data.sub, {
                email: $scope.form.email,
                fullname: $scope.form.fullname,
            })
            .then(function(res) {
                scaMessage.success("Successfully signed up!");
                sessionStorage.removeItem('auth_redirect');
                document.location = redirect;
            }, function(res) {
                toaster.error(res.data.message);
            });
        }, function(res) {
            toaster.error(res.data.message);
        });         
    }
}]);

app.controller('CompleteController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', 'scaMessage',
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, scaMessage) {
    $scope.$parent.active_menu = 'complete';
    scaMessage.show(toaster);
    var jwt = localStorage.getItem(appconf.jwt_id);
    var user = jwtHelper.decodeToken(jwt);
    
    //stores form
    $scope.form = {};

    $http.get(appconf.api+'/me')
    .then(function(res, status, headers, config) {
        $scope.form.username = res.data.username;
        $scope.form.email = res.data.email;
    }, function(res) {
        toaster.error(res.data.message);
    }); 

    //decide where to go after setting password
    var redirect = sessionStorage.getItem('auth_redirect');
    if(!redirect) redirect = document.referrer;
    if(!redirect) redirect = appconf.default_redirect_url;

    function put_profile(cb) {
        $http.put(appconf.profile_api+'/public/'+user.sub, {
            email: $scope.form.email,
            fullname: $scope.form.fullname,
        }).then(function(res) {
            cb(res);
        }, function(res) {
            toaster.error(res.data.message);
        });
    }
    function set_pass(cb) {
        console.dir($scope.form);
        $http.put(appconf.api+'/local/setpass', {password: $scope.form.password})
        .then(function(res) {
            cb(res);
        }, function(res) {
            toaster.error(res.data.message);
        });         
    }
    function alldone() {
        scaMessage.success("Registration Complete!");
        sessionStorage.removeItem('auth_redirect');
        document.location = redirect;
    }
    $scope.submit = function() {
        if($scope.form.password) {
            set_pass(function(res) {
                put_profile(function(res) {
                    alldone();
                });
            });
        } else {
            put_profile(function(res) {
                alldone();
            });
        }
    }
}]);

app.controller('SettingsController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'profile', 'serverconf', 'jwtHelper', 'scaMessage', 'scaSettingsMenu',
function($scope, appconf, $route, toaster, $http, profile, serverconf, jwtHelper, scaMessage, scaSettingsMenu) {
    $scope.$parent.active_menu = 'user';
    $scope.public_profile = profile.pub;
    $scope.user = null;
    $scope.form_password = {};
    scaMessage.show(toaster);

    //for debug pane
    var jwt = localStorage.getItem(appconf.jwt_id);
    var user = jwtHelper.decodeToken(jwt);
    $scope.user = user;
    $scope.settings_menu = scaSettingsMenu;
    $scope.debug = {jwt: user};

    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    $http.get(appconf.api+'/me').success(function(info) { $scope.user = info; });

    $scope.submit_password = function() {
        //if($scope.form_password.new == $scope.form_password.new_confirm) {
        $http.put(appconf.api+'/local/setpass', {password_old: $scope.form_password.old, password: $scope.form_password.new})
        .then(function(res, status, headers, config) {
            /*
            var redirect = sessionStorage.getItem('auth_settings_redirect');
            if(redirect) {
                scaMessage.success("Account settings updated successfully!");
                sessionStorage.removeItem('auth_settings_redirect');
                document.location = redirect;
            } else {
                toaster.success(res.data.message);
                $http.get(appconf.api+'/me').success(function(info) { $scope.user = info; });
            }
            */
            toaster.success(res.data.message);
            $http.get(appconf.api+'/me').success(function(info) { $scope.user = info; });
        }, function(res, status, headers, config) {
            toaster.error(res.data.message);
        });
        /*
        } else {
            console.log("password confirmation fail");
        }
        */
    }

    $scope.disconnect = function(type, data) {
        $http.put(appconf.api+'/'+type+'/disconnect', data)
        .then(function(res) {
            toaster.success(res.data.message);
            $scope.user = res.data.user;
            /*
            //for updating UI..
            switch(type) {
            case "iucas": delete $scope.user.iucas; break;
            case "git": delete $scope.user.gitid; break;
            case "google": delete $scope.user.googleid; break;
            case "x509": delete $scope.user.x509dn; break;
            }
            */
        }, function(res) {
            toaster.error(res.data.message);
        });
    }

    $scope.iucas_connect = function() {
        sessionStorage.setItem('auth_redirect', window.location.href); 
        var casurl = window.location.origin+window.location.pathname+'iucascb.html';
        window.location = appconf.iucas_url+'?cassvc=IU&casurl='+casurl;
    }
    $scope.git_connect = function() {
        toaster.info("git_connect todo");
    }
    $scope.google_connect = function() {
        toaster.info("google_connect todo");
    }
    $scope.x509_connect = function() {
        $http.get(appconf.x509api+'/x509/connect') //, {headers: null})
        .then(function(res, status, headers, config) {
            toaster.success(res.data.message);
            $scope.user = res.data.user;
        }, function(res, status, headers, config) {
            toaster.error(res.data.message);
        }); 
    }

}]);

app.controller('ForgotpassController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', '$routeParams', '$location', 'scaMessage', 
function($scope, appconf, $route, toaster, $http, jwtHelper, $routeParams, $location, scaMessage) {
    $scope.$parent.active_menu = 'user'; //TODO - is there a better menu?
    scaMessage.show(toaster);
}]);

app.directive('passwordStrength', function() {
    return {
        scope: {
            password: "=password",
          
            //optional attributes to make password more secure
            profile: "=profile",
            user: "=user",
        },
        templateUrl: 't/passwordstrength.html',
        link: function(scope, element, attributes) {
            scope.password_strength = {};
            scope.$watch('password', function(newv, oldv) {
                if(newv) {
                    //gather strings that we don't want user to use as password (like user's own fullname, etc..)
                    var used = [];
                    if(scope.profile) used.push(scope.profile.fullname);
                    if(scope.user) { 
                        used.push(scope.user.username);
                        used.push(scope.user.email);
                    }
                    //https://blogs.dropbox.com/tech/2012/04/zxcvbn-realistic-password-strength-estimation/
                    var st = zxcvbn(newv, used);
                    scope.password_strength = st;
                }
            });
        }
    };
});

