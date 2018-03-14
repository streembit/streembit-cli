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


const program = require('commander');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const levelup = require('levelup');
const async = require('async');
const util = require('util');
const assert = require('assert');
const logger = require("streembit-util").logger;
const AppsHandler = require("apps");
const database = require("streembit-db").instance;
const config = require('libs/config');
const utils = require("libs/utils");
const Account = require("libs/account");
const Tasks = require("libs/tasks");
const events = require("streembit-util").events;
const Users = require("libs/users");
const HttpTransport = require("./transport/http");
const WebSocket = require("./transport/ws");
const ServicesHandler = require("./services");
const dbschema = require("./dbschema");
const WhitelistDB = require("libs/database/whitelistdb");
const constants = require("libs/constants");

// initialize the logger
module.exports = exports = function (port, ip, password) {
    try {
        async.waterfall(
            [
                function (callback) {
                    try {
                        config.init(port, ip, callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    try {
                        var loglevel = config.log && config.log.level ? config.log.level : "debug";
                        if (config.cmdinput) {
                            logger.init(loglevel, null, ['file']);
                        } else {
                            logger.init(loglevel);
                        }

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
                    try {
                        const account = new Account();
                        account.init(password, callback);
                    }
                    catch (e) {
                        callback("Account init error: " + e.message);
                    }
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
                        var users = new Users();
                        users.init(callback);
                    }
                    catch (e) {
                        callback("Users init error: " + e.message);
                    }
                },
                function (callback) {
                    let port = config.transport && config.transport.ws && config.transport.ws.port ? config.transport.ws.port : constants.DEFAULT_WS_PORT;
                    let maxconn = config.transport && config.transport.ws && config.transport.ws.maxconn ? config.transport.ws.maxconn : constants.DEFAULT_WS_MAXCONN;
                    let wsserver = new WebSocket(port, maxconn);
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

module.exports.display_data = function (password) {

    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                database.init(dbschema, callback);
            },
            function (callback) {
                const account = new Account();
                account.load(password, callback);
            }
        ],
        function (err, result) {
            if (err) {
                return console.log(err.message || err);
            }

            const account = new Account();
            //print the node ID
            console.log("accountname: %s", account.accountname);
            console.log("node ID: %s", account.accountpk);
            console.log("publickey hex: %s", account.public_key);
            console.log("publickey encoded hash: %s", account.public_key_hash);
            console.log("publickey bs58pk: %s", account.bs58pk);
        }
    ); 

};

module.exports.changepwd = function() {
    console.log("app change password");
};

module.exports.list_users = function (password) {
    console.log("list users");
    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                database.init(dbschema, callback);
            },
            function (callback) {
                const account = new Account();
                account.load(password, callback);
            },
            function (callback) {
                try {
                    var users = new Users();
                    users.init(callback);
                }
                catch (e) {
                    callback("Users init error: " + e.message);
                }
            }
        ],
        function (err, result) {
            if (err) {
                return console.log(err.message || err);
            }

            var users = new Users();
            var list = users.list();
            console.log(util.inspect(list));
        }
    ); 
};

module.exports.delete_user = function (password) {
    // get the password from the command prompt
    utils.prompt_for_userid(function (err, userid) {
        if (err) {
            return console.log(err.message || err);
        }

        //delete the user id
        async.waterfall(
            [
                function (callback) {
                    config.init_account_params(callback);
                },
                function (callback) {
                    database.init(dbschema, callback);
                },
                function (callback) {
                    const account = new Account();
                    account.load(password, callback);
                },
                function (callback) {
                    try {
                        var users = new Users();
                        users.init(callback);
                    }
                    catch (e) {
                        callback("Users init error: " + e.message);
                    }
                }
            ],
            function (err, result) {
                if (err) {
                    return console.log(err.message || err);
                }   

                console.log("deleting user ID: " + userid);

                var users = new Users();
                users.delete_user(userid).then(
                    () => {
                        console.log("User was deleted from the database");
                    })
                    .catch(
                        (err) => {
                            console.log("Deleting user failed: " + err.message || err);
                        }
                    );              
            }
        ); 

    });
};


module.exports.backup = function(password) {
    console.log("app backup account data");

    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                try {
                    database.init(dbschema, callback);
                }
                catch (err) {
                    callback(err);
                }
            },
            function (callback) {
                const account = new Account();
                account.load(password, function (err) {
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
};

module.exports.whitelist_update = function (password, pkey, rm) {
    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                database.init(dbschema, callback);
            },
            function (callback) {
                const account = new Account();
                account.load(password, callback);
            },
            function (callback) {
                const db = new WhitelistDB();
                callback(null, db);
            }
        ],
        function (err, wlDb) {
            if (err) {
                return console.log(err.message || err);
            }

            pkey = pkey.replace(/["']/g, '');

            console.log("updating whitelist: " +pkey);

            if (!rm) {
                wlDb.add_rule(pkey, 1).then(
                    () => {
                        console.log("Whitelist rule was added");
                    })
                    .catch(
                        (err) => {
                            console.log("Error adding whitelist rule: " +err);
                        }
                    );
            }
            else {
                wlDb.delete_rule(pkey).then(
                    () => {
                        console.log("Whitelist rule was deleted");
                    })
                    .catch(
                        (err) => {
                            console.log("Error deleting whitelist rule: " +err);
                        }
                    );
            }
        }
    );
};

module.exports.get_wl = function (password) {
    async.waterfall(
        [
            function (callback) {
                config.init_account_params(callback);
            },
            function (callback) {
                database.init(dbschema, callback);
            },
            function (callback) {
                const account = new Account();
                account.load(password, callback);
            },
            function (callback) {
                const db = new WhitelistDB();
                callback(null, db);
            }
        ],
        function (err, wlDb) {
            if (err) {
                return console.log(err.message || err);
            }


            wlDb.get_rules().then(
                (res) => {
                    console.log(res);
                })
                .catch(
                    (err) => {
                        console.log("Error adding whitelist rule: " +err);
                    }
                );

        }
    );
};
