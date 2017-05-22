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

var streembit = streembit || {};

var assert = require('assert');
var config = require('config');
var program = require('commander');
var prompt = require('prompt');


streembit.config = (function (cnfobj) {

    const DEFAULT_STREEMBIT_PORT = 32320;

    var m_seed_config = null;
    var m_client_config = null;
    var m_iot_config = null;
    var m_blockchain_config = null;
    var m_password = null;
    var m_port = null;
    var m_ipaddress = null;

    Object.defineProperty(cnfobj, "password", {
        get: function () {
            return m_password;
        },

        set: function (value) {
            m_password = value;
        }
    });

    Object.defineProperty(cnfobj, "ipaddress", {
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

    function parseIpPort(val) {
        var port = 0;
        if (val) {
            port = parseInt(val);
            if (isNaN(port)) {
                console.log("Invald port was entered - will be using the default port");
                port = 0;
            }
        }
        return port;
    }

    //
    // Validate the configuration file
    //
    function validate_config() {

    }

    function prompt_for_password(callback) {
        // show the prompt if the password was not supplied in the cmd line argument nor in the config file
        var schema = {
            properties: {
                password: {
                    hidden: true
                }
            }
        };

        prompt.message = "";

        // Since there is no password was provided start the command prompt
        // Get the password from the user via the command prompt
        prompt.start();
        prompt.get(schema, function (err, result) {
            password = result.password.trim();
            assert(password, "Password that protects the private key must exist in the command line arguments or in the config.json file or you must type at the command prompt.");
            callback(password);
        });

    }

    cnfobj.init = function (callback) {
        try {

            // show the command prompt when the user type --help
            // and get the configuration values from the command prompt
            program
                .version('1.0.1')
                .option('-w, --password [value]', 'Password to protect the private key')
                .option('-i, --ip [value]', 'IP address for the Streembit seed')
                .option('-p, --port <num>', 'Port for the Streembit client', parseIpPort)
                .parse(process.argv);


            var ipport = program.port ? program.port : 0;
            if (!ipport) {
                //  check the config file
                ipport = config.port || DEFAULT_STREEMBIT_PORT;
            }
            assert(ipport > 0 && ipport < 65535, "Invalid port configuration value");
            cnfobj.port = ipport;

            var ip = program.ip;
            if (!ip) {
                //  check the config file
                ip = config.ipaddress || 0;
            }
            cnfobj.ipaddress = ip;

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
            //throw an exception if the IoT config entry is missing
            assert(cnfobj.iot_config && cnfobj.iot_config.hasOwnProperty("run"), "Invalid seed configuration section");
            if (isseed && cnfobj.iot_config.run) {
                throw new Error("Invalid configuration. IoT handler cannot run when the seed is configured to run");
            }

            var clientcfarr = config.modules.filter(function (item) {
                return item.name == "client";
            });
            var clientconf = clientcfarr && clientcfarr.length ? clientcfarr[0] : 0;
            cnfobj.client_config = clientconf;
            //throw an exception if the IoT config entry is missing
            assert(cnfobj.client_config && cnfobj.client_config.hasOwnProperty("run"), "Invalid client configuration section");
            if (isseed && cnfobj.client_config.run) {
                throw new Error("Invalid configuration. Client handler cannot run when the seed is configured to run");
            }

            var blockchain_confarr = config.modules.filter(function (item) {
                return item.name == "blockchain";
            });
            var bcconf = blockchain_confarr && blockchain_confarr.length ? blockchain_confarr[0] : 0;
            cnfobj.blockchain_config = bcconf;
            //throw an exception if the IoT config entry is missing
            assert(cnfobj.blockchain_config && cnfobj.blockchain_config.hasOwnProperty("run"), "Invalid blockchain configuration section");

            var password = program.password;
            if (!password) {
                //  check the config file
                password = config.password ? config.password : 0;
                cnfobj.password = password;
            }

            if (password) {
                return callback();
            }

            // get the password from the command prompt
            prompt_for_password(function (pwd) {
                cnfobj.password = password;
                callback();
            });
            
        }
        catch (err) {
            callback(err.message);
        }
    };


    return cnfobj;

}(streembit.config || {}));

module.exports = streembit.config;