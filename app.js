/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Z Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


var program = require('commander');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
var logger = require("streembit-util").logger;
var AppsHandler = require("apps");
var database = require("streembit-db").instance;
var config = require('libs/config');
var utils = require("libs/utils");
var Account = require("libs/account");
var Tasks = require("libs/tasks");
var events = require("streembit-util").events;
const Users = require("libs/users");
const HttpTransport = require("./transport/http");
const WebSocket = require("./transport/ws");
const ServicesHandler = require("./services");
const dbschema = require("./dbschema");

// initialize the logger
module.exports = exports = function (port, ip, password) {
    try {
        async.waterfall(
            [
                function (callback) {
                    try {
                        config.init(port, ip, password, callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    try {
                        var loglevel = config.log && config.log.level ? config.log.level : "debug";
                        logger.init(loglevel);
                        callback();
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    database.init(dbschema, callback);
                },
                function (callback) {
                    var options = {
                        port: config.transport.port
                    };
                    var httptransport = new HttpTransport(options);
                    httptransport.init(callback);
                },
                function (callback) {
                    try {
                        var tasks = new Tasks();
                        tasks.run(callback);
                    }
                    catch (e) {
                        callback("Task init error: " + e.message);
                    }
                },
                function (callback) {
                    try {
                        var account = new Account();
                        account.init(callback)
                    }
                    catch (e) {
                        callback("Account init error: " + e.message);
                    }
                },
                function (callback) {
                    try {
                        var users = new Users();
                        users.init(callback);
                    }
                    catch (e) {
                        callback("Users init error: " + e.message);
                    }
                },
                function (callback) {
                    let port = config.transport && config.transport.ws && config.transport.ws.port ? config.transport.ws.port : 32318;
                    let wsserver = new WebSocket(port);
                    wsserver.init(callback);
                },      
                function (callback) {
                    ServicesHandler.init(callback)
                },
                function (callback) {
                    try {
                        let apps = new AppsHandler();
                        apps.init(callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                }
            ],  
            function (err) {
                if (err) {
                    return logger.error("application init error: %j", err);
                }

                logger.info("The application has been initialized.");

                // app init event
                events.appinit();
            }
        );
    }
    catch (e) {
        console.log("app error: " + e.message);
    }
};

module.exports.display_data = function () {

    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                if (!config.password) {
                    return callback("Invalid password");
                }

                database.init(__dirname, callback);
            },
            function (callback) {
                var account = new Account();
                account.load(config.password, config.account, callback);
            }
        ],
        function (err, result) {
            if (err) {
                return console.log(err.message || err);
            }

            var account = new Account();
            //print the node ID
            console.log("accountname: %s", account.accountname);
            console.log("node ID: %s", account.accountpk);
            console.log("publickey hex: %s", account.public_key);
            console.log("publickey encoded hash: %s", account.public_key_hash);
            console.log("publickey bs58pk: %s", account.bs58pk);
        }
    ); 

}

module.exports.changepwd = function() {
    console.log("app change password");
}

module.exports.backup = function() {
    console.log("app backup account data");

    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                if (!config.password) {
                    return callback("Invalid password");
                }
                try {
                    database.init(__dirname, callback);
                }
                catch (err) {
                    callback(err);
                }
            },
            function (callback) {
                var account = new Account();
                account.load(config.password, config.account,function (err) {
                    if (err) {
                        return callback(err);
                    }

                    var data = {        
                        bs58pk: account.bs58pk,
                        pkhex: account.public_key,
                        encoded_pkhash: account.public_key_hash,                        
                        private_key: account.private_key_hex,
                        nodeid: account.accountpk
                    };

                    callback(null, data);
                });
            },
            function (data, callback) {
                try {
                    // write to file
                    data.timestamp = Date.now();
                    var str = JSON.stringify(data, null, 4);  
                    var wdir = process.cwd();
                    var datadir = path.join(wdir, 'data');
                    var backupfile = path.join(datadir, 'account.json');
                    fs.writeFile(backupfile, str, function (err) {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });

                }
                catch (err) {
                    callback(err);
                }
            }
        ],
        function (err) {
            if (err) {
                return console.log("Backup error: %j", err.message || err);
            }

            console.log("Backup file account.json was created in the data directory");
        }
    ); 
}
