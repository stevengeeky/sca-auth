#DEBUG=auth:* env=dev PORT=12000 nodemon -i node_modules ./index.js
DEBUG=auth:* env=dev PORT=12000 pm2 start auth.js --watch 
