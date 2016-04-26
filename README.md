SCA authentication module reponsible performing user authentication and token generation.

All components who uses this auth module will need public key from this authentication module (via api or config?)

## Installation

`npm install sca-auth`

## Test

`npm test`

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

Implement #/forgotpass
Fix: trying to access https://soichi7.ppa.iu.edu/auth/#/settings without first login, forced to login, then jump back to /settings, it goes to https://soichi7.ppa.iu.edu/settings instead.

If a user has multiple account, trying to associate with same IUCAS account ends up with basically logging in as the user account that's already associated with the IU CAS account.

Don't forward jwt to pages under domain that's not configured to do so (by default, it should limit to the same-origin domain name)

iucas/register_newuser. If the uid is already registered, instead of veto-ing, forward user to a special login page and once logged in successfully, associate the IUCAS IU to the user account

Make sure only root (or allowed group of users) can issue token via CLI

Allow admin to reset password via administration/users pagee
Allow user to reset his/her own password
Allow admin to remove account (what should happend to profile and cached profile on other services?)
Add event table logging all authentication related events (change password, etc..)

Don't let user disconnect account if there is only 1 account left that's associated with it

Implement password locking mechanism after repeated failed attempt (not necessary because we delay failed password re-try?)
