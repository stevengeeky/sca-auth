SCA authentication module reponsible performing user authentication and token generation.

all components who uses this auth module will need public key from this authentication module (via api or config?)

# Token refresh

JWT token's TTL is 3 days by default (configurable - see config/default_config.js). It's client's responsibility to refresh the token while it's still valid to prevent the JWT expiration by making POST request to /refresh

Request
```
POST https://test.com/api/auth/refresh
```

Response
```
{"jwt": "....the jwt..."}
```

In AngularJS, you can implement your jwtInterceptor so that if JWT token is expiring soon (like in an hour), it will make /refresh request before making the main request. You can see the sample code in ui/js/app.js

# TODO

?
