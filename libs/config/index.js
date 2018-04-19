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

const assert = require('assert');
const config = require('config');
const program = require('commander');
const constants = require("libs/constants");
const exec = require('child_process').exec;

var streembit_config = (function (cnfobj) {
    var m_cmdinput = null;
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
    var m_database_name = null;
    var m_users = null;
    var m_limits = null;
    var m_wsmode = null;

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

    Object.defineProperty(cnfobj, "cmdinput", {
        get: function () {
            return m_cmdinput;
        },

        set: function (value) {
            m_cmdinput = value;
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

    Object.defineProperty(cnfobj, "wsmode", {
        get: function () {
            return m_wsmode;
        },

        set: function (value) {
            m_wsmode = value;
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

    Object.defineProperty(cnfobj, "database_name", {
        get: function () {
            return m_database_name;
        },

        set: function (value) {
            m_database_name = value;
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

    cnfobj.transport = {
        "protocol": "",
        "host": "",
        "localip": 0,
        "port": 0,
        "ws": {
            "port": 0
        }
    };

    cnfobj.limits = {
        "refresh": 0,
        "replicate": 0,
        "republish": 0,
        "expire": 0,
        "timeout": 0
    };


    cnfobj.init = function (argv_port, argv_ip, callback) {
        try {
            cnfobj.log = config.log;

            // set the ssl flag
            cnfobj.transport.ssl = config.transport.ssl;
            cnfobj.transport.cert = config.transport.cert;
            cnfobj.transport.key = config.transport.key;
            cnfobj.transport.ca = config.transport.ca;

            var ipport = argv_port ? argv_port : 0;
            if (!ipport) {
                //  check the config file
                ipport = config.transport.port || constants.DEFAULT_STREEMBIT_PORT;
            }
            assert(ipport > 0 && ipport < 65535, "Invalid port configuration value");
            cnfobj.transport.port = ipport;

            var ip = argv_ip;
            if (!ip) {
                //  check the config file
                ip = config.transport.host || 0;
            }
            cnfobj.transport.host = ip;

            // set the ws port
            cnfobj.transport.ws.port = config.transport.ws.port || constants.DEFAULT_WS_PORT;
            // set the ws max connection 
            cnfobj.transport.ws.maxconn = config.transport.ws.maxconn || constants.DEFAULT_WS_MAXCONN;


            cnfobj.cmdinput = config.cmdinput && !program.pm2;

            cnfobj.seeds = config.seeds;

            cnfobj.usertype = config.usertype || constants.USERTYPE_HUMAN;

            // if (!config.account) {
            //     return callback("account is missing from the configuration file.");
            // }
            // cnfobj.account = config.account;

            if (!config.database_name) {
                return callback("database_name is missing from the configuration file.");
            }
            cnfobj.database_name = config.database_name;

            cnfobj.limits = {};

            // time limits set for kad tools
            // the defult values like 3600 are in seconds so needs to get the milliseconds here
            cnfobj.limits.refresh = (config.limits && config.limits.refresh && config.limits.refresh >= 3600) ? (config.limits.refresh * 1000) : 3600 * 1000;
            cnfobj.limits.replicate = (config.limits && config.limits.replicate && config.limits.replicate >= 3600 ) ? (config.limits.replicate * 1000) : 3600 * 1000;
            cnfobj.limits.republish = (config.limits && config.limits.republish && config.limits.republish >= 43200) ? (config.limits.republish * 1000) : 86400 * 1000;
            cnfobj.limits.expire = (config.limits && config.limits.expire && config.limits.expire >= 43201) ? (config.limits.expire * 1000) : 86405 * 1000;
            cnfobj.limits.timeout = (config.limits && config.limits.timeout && config.limits.timeout >= 4) ? (config.limits.timeout * 1000) : 5 * 1000;

            // Validate the configuration file. There are some configurations disallowed. Throw an exception here if we detect such invalid configuration
            var seedcfarr = config.modules.filter(function (item) {
                return item.name == "seed";
            });
            var seedconf = seedcfarr && seedcfarr.length ? seedcfarr[0] : 0;
            cnfobj.seed_config = seedconf;
            if (!cnfobj.seed_config) {
                cnfobj.seed_config = {run: false}
            }
            if (!cnfobj.seed_config.hasOwnProperty("run")) {
                cnfobj.seed_config.run = false;
            }
            var isseed = cnfobj.seed_config.run;

            var iot_confarr = config.modules.filter(function (item) {
                return item.name == "iot";
            });
            var iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
            cnfobj.iot_config = iotconf;
            if (!cnfobj.iot_config) {
                cnfobj.iot_config = {}
            }
            if (!cnfobj.iot_config.hasOwnProperty("run")) {
                cnfobj.iot_config.run = false;
            }

            if (isseed && cnfobj.iot_config.run) {
                throw new Error("Invalid configuration. IoT handler cannot run when the seed is configured to run");
            }

            var clientcfarr = config.modules.filter(function (item) {
                return item.name == "client";
            });
            var clientconf = clientcfarr && clientcfarr.length ? clientcfarr[0] : 0;
            cnfobj.client_config = clientconf;
            if (!cnfobj.client_config) {
                cnfobj.client_config = {}
            }
            if (!cnfobj.client_config.hasOwnProperty("run")) {
                cnfobj.client_config.run = false;
            }
            if (isseed && cnfobj.client_config.run) {
                throw new Error("Invalid configuration. Client handler cannot run when the seed is configured to run");
            }

            var blockchain_confarr = config.modules.filter(function (item) {
                return item.name == "blockchain";
            });
            var bcconf = blockchain_confarr && blockchain_confarr.length ? blockchain_confarr[0] : 0;
            cnfobj.blockchain_config = bcconf;
            if (!cnfobj.blockchain_config) {
                cnfobj.blockchain_config = {}
            }
            if (!cnfobj.blockchain_config.hasOwnProperty("run")) {
                cnfobj.blockchain_config.run = false;
            }

            // set the wsmode, it could be either none, srvc (service mode) or iot (IoT mode)
            var wsm = constants.WSMODE_NONE;
            if (seedconf && seedconf.run) {
                wsm = constants.WSMODE_SRVC;
            }
            else if (bcconf && bcconf.run) {
                wsm = constants.WSMODE_SRVC;
            }
            else if (iotconf && iotconf.run) {
                wsm = constants.WSMODE_IOT;
            }

            cnfobj.wsmode = wsm;

            // get the dns handler settings
            var dnsconf = config.modules.filter(function (item) {
                return item.name == "dns";
            });
            if (dnsconf && dnsconf.length) {
                if (!dnsconf[0].host || !dnsconf[0].port) {
                    throw new Error("Invalid DNS configuration. Host and port are required");
                }
                cnfobj.dns = dnsconf[0];
            }
            else{
                cnfobj.dns = {run: false};
            }

            if (cnfobj.client_config.run) {
                exec("ifconfig | grep -Eo 'inet (addr:)?([0-9]*\\.){3}[0-9]*' | grep -Eo '([0-9]*\\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1 | tr -d '\n'",
                //exec("ip route get 1 | head -1 | awk '{ print $NF }' | tr -d '\n'",
                    (err, ip4) => {
                        if (err !== null) {
                            throw new Error(`exec error: ${err}`);
                        }

                        cnfobj.transport.localip = ip4;

                        return callback();
                    });
            } else {
                return callback();
            }
        }
        catch (err) {
            callback(err.message);
        }
    };

    cnfobj.init_account_params = function (callback) {
        try {

            var iot_confarr = config.modules.filter(function (item) {
                return item.name == "iot";
            });
            var iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
            cnfobj.iot_config = iotconf;

            if (!config.database_name) {
                return callback("database_name is missing from the configuration file.");
            }
            cnfobj.database_name = config.database_name;

            return callback();
        }
        catch (err) {
            callback(err.message);
        }
    };

    return cnfobj;

}({}));

module.exports = streembit_config;
