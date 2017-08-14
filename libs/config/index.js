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
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var assert = require('assert');
var config = require('config');
var utils = require("libs/utils");
var constants = require("libs/constants");

var streembit_config = (function (cnfobj) {
    var m_seed_config = null;
    var m_client_config = null;
    var m_iot_config = null;
    var m_blockchain_config = null;
    var m_password = null;
    var m_port = null;
    var m_ipaddress = null;
    var m_log = null;
    var m_seeds = null;
    var m_usertype = null;
    var m_account_name = null;
    var m_net = null;
    var m_users = null;

    Object.defineProperty(cnfobj, "password", {
        get: function () {
            return m_password;
        },

        set: function (value) {
            m_password = value;
        }
    });

    Object.defineProperty(cnfobj, "host", {
        get: function () {
            return m_ipaddress;
        },

        set: function (value) {
            m_ipaddress = value;
        }
    });

    Object.defineProperty(cnfobj, "seed_config", {
        get: function () {
            return m_seed_config;
        },

        set: function (value) {
            m_seed_config = value;
        }
    });

    Object.defineProperty(cnfobj, "client_config", {
        get: function () {
            return m_client_config;
        },

        set: function (value) {
            m_client_config = value;
        }
    });

    Object.defineProperty(cnfobj, "iot_config", {
        get: function () {
            return m_iot_config;
        },

        set: function (value) {
            m_iot_config = value;
        }
    });

    Object.defineProperty(cnfobj, "blockchain_config", {
        get: function () {
            return m_blockchain_config;
        },

        set: function (value) {
            m_blockchain_config = value;
        }
    });

    Object.defineProperty(cnfobj, "port", {
        get: function () {
            return m_port;
        },

        set: function (value) {
            m_port = value;
        }
    });

    Object.defineProperty(cnfobj, "log", {
        get: function () {
            return m_log;
        },

        set: function (value) {
            m_log = value;
        }
    });

    Object.defineProperty(cnfobj, "seeds", {
        get: function () {
            return m_seeds;
        },

        set: function (value) {
            m_seeds = value;
        }
    });

    Object.defineProperty(cnfobj, "usertype", {
        get: function () {
            return m_usertype;
        },

        set: function (value) {
            m_usertype = value;
        }
    });

    Object.defineProperty(cnfobj, "account", {
        get: function () {
            return m_account_name;
        },

        set: function (value) {
            m_account_name = value;
        }
    });

    Object.defineProperty(cnfobj, "net", {
        get: function () {
            return m_net;
        },

        set: function (value) {
            m_net = value;
        }
    });

    Object.defineProperty(cnfobj, "users", {
        get: function () {
            return m_users;
        },

        set: function (value) {
            m_users = value;
        }
    });

    cnfobj.init = function (argv_port, argv_ip, argv_password, callback) {
        try {

            cnfobj.log = config.log;

            var ipport = argv_port ? argv_port : 0;
            if (!ipport) {
                //  check the config file
                ipport = config.port || constants.DEFAULT_STREEMBIT_PORT;
            }
            assert(ipport > 0 && ipport < 65535, "Invalid port configuration value");
            cnfobj.port = ipport;

            var ip = argv_ip;
            if (!ip) {
                //  check the config file
                ip = config.host || 0;
            }
            cnfobj.host = ip;

            cnfobj.seeds = config.seeds;

            cnfobj.usertype = config.usertype || constants.USERTYPE_HUMAN;

            if (!config.account) {
                return callback("account is missing from the configuration file.");
            }
            cnfobj.account = config.account;

            cnfobj.users = config.users;

            // Validate the configuration file. There are some configurations disallowed. Throw an exception here if we detect such invalid configuration
            var seedcfarr = config.modules.filter(function (item) {
                return item.name == "seed";
            });
            var seedconf = seedcfarr && seedcfarr.length ? seedcfarr[0] : 0;
            cnfobj.seed_config = seedconf;
            //throw an exception if the seed config entry is missing
            assert(cnfobj.seed_config && cnfobj.seed_config.hasOwnProperty("run"), "Invalid seed configuration section");
            var isseed = cnfobj.seed_config.run;

            var iot_confarr = config.modules.filter(function (item) {
                return item.name == "iot";
            });
            var iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
            cnfobj.iot_config = iotconf;
            //throw an exception if the IoT run config entry is missing
            assert(cnfobj.iot_config && cnfobj.iot_config.hasOwnProperty("run"), "Invalid IoT configuration section");
            if (isseed && cnfobj.iot_config.run) {
                throw new Error("Invalid configuration. IoT handler cannot run when the seed is configured to run");
            }

            var clientcfarr = config.modules.filter(function (item) {
                return item.name == "client";
            });
            var clientconf = clientcfarr && clientcfarr.length ? clientcfarr[0] : 0;
            cnfobj.client_config = clientconf;
            //throw an exception if the Client run config entry is missing
            assert(cnfobj.client_config && cnfobj.client_config.hasOwnProperty("run"), "Invalid client configuration section");
            if (isseed && cnfobj.client_config.run) {
                throw new Error("Invalid configuration. Client handler cannot run when the seed is configured to run");
            }

            var blockchain_confarr = config.modules.filter(function (item) {
                return item.name == "blockchain";
            });
            var bcconf = blockchain_confarr && blockchain_confarr.length ? blockchain_confarr[0] : 0;
            cnfobj.blockchain_config = bcconf;
            //throw an exception if the BC run config entry is missing
            assert(cnfobj.blockchain_config && cnfobj.blockchain_config.hasOwnProperty("run"), "Invalid blockchain configuration section");

            var password = argv_password;
            if (!password && config.password) {
                //  check the config file
                cnfobj.password = config.password;  
                return callback();
            }

            // get the password from the command prompt
            utils.prompt_for_password(function (err, pwd) {
                if (err) {
                    return callback(err);
                }

                cnfobj.password = pwd;
                callback();
            });
            
        }
        catch (err) {
            callback(err.message);
        }
    };

    cnfobj.init_account_params = function (callback) {
        try {
            if (!config.account) {
                return callback("account is missing from the configuration file.");
            }

            cnfobj.account = config.account;
            cnfobj.users = config.users;
            var iot_confarr = config.modules.filter(function (item) {
                return item.name == "iot";
            });
            var iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
            cnfobj.iot_config = iotconf;

            if (config.password) {
                //  check the config file
                cnfobj.password = config.password;
                return callback();
            }

            // get the password from the command prompt
            utils.prompt_for_password(function (err, pwd) {
                if (err) {
                    return callback(err);
                }

                cnfobj.password = pwd;
                callback();
            });

        }
        catch (err) {
            callback(err.message);
        }
    };

    return cnfobj;

}({}));

module.exports = streembit_config;