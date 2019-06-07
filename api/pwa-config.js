const config = require('config');

//const fs = require('fs');

console.log("testing config");
//console.log("config", config);
//config.get(config.configPath + '/auth/index.js');
//require(config.configPath + "/auth");
//var configPath = config.configPath || "";
//var configPath = config.configPath || "";
var configPath = config.util.getEnv('NODE_CONFIG_DIR') || "/etc/perfsonar/psconfig-web";
console.log("configPath", configPath);
var pwaConfig = require(configPath + '/auth/'); //, {configPath: config.configPath});

//console.log("configZ", prettyJSON(configZ));
//console.log("configZ.logger", configZ.logger);
//console.log("configZ.logger.winston", configZ.logger.winston);

exports.getConfig = function() {
    return pwaConfig;
}
