#DEBUG=auth:* env=dev PORT=12000 nodemon -i node_modules ./index.js

pm2 start auth.js --watch 

pm2 logs auth
