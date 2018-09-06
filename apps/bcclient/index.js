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
Author: Streembit team
Copyright (C) 2018 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const constants = require("libs/constants");
const config = require("libs/config");
const { events, logger } = require("streembit-util");
const peerutils = require("libs/peernet/peerutils");
const PeerClient = require("libs/peernet/peerclient");
const libutils = require("libs/utils");
const prompt = require('prompt');


const peerclient = new PeerClient();
const interval = 600000; // 10 mins

class BcCmdHandler {
    constructor() {}

    run(callback = () => {}) {
        try {
            const schema = {
                properties: {
                    cmd: {
                        description: 'Enter blockchain client command',
                        type: 'string',
                        pattern: /^[\s+]?\w{4,26} \-[a-zA-Z0-9=\"\-]{6,} \-[a-zA-Z0-9=\"\-]{6,}[\s+]?[a-zA-Z0-9=\"\-]{2,60}?[\s+]?[a-zA-Z0-9=\"\-]{2,60}?[\s+]?$/,
                        message: 'Invalid command',
                        required: true
                    },
                }
            };

            prompt.message = "";

            prompt.start();

            prompt.get(schema, (err, result) => {
                if (err) {
                    if (err.message === 'canceled') { // ^C
                        // shut down cmd prompt gracefully
                        console.log("\nCMD input has been terminated by user");
                        this.stop();
                    }

                    return this.cmddone(err);
                }

                this.processInput(result.cmd);
            });

            callback();
        } catch (err) {
            callback.toString().length > 10
                ? callback("CMD handler error: " + err.message)
                : this.cmddone(err);
        }
    }

    processInput(inp) {
        try {
            inp = inp.trim().replace(/\s+/, ' ');
            const
                inp_r = inp.split(' '),
                cmd = inp_r[0],
                args = inp_r.splice(1),
                creds = { user: null, password: null },
                params = [];

            console.log('COMMAND:', inp_r[0]);
            console.log('ARGS:', ...inp_r.splice(1));

            for (let i = 0; i < args.length; ++i) {
                let arg = args[i].replace(/[\"\']+/,'').trim();

                if (/^\-rpcuser=/.test(arg)) {
                    creds.user = arg.replace(/^\-rpcuser=/,'');
                } else if (/^\-rpcpassword=/.test(arg)) {
                    creds.password = arg.replace(/^\-rpcpassword=/,'');
                } else {
                    params.push(arg);
                }
            }

            switch (cmd) {
                case 'addmultisigaddress':
                    console.log('CASE addmultisigaddress', creds, params);
                    this.run();
                    break;
                default:
                    this.helper();
                    this.run();
                    break;
            }
        } catch (e) {
            this.cmddone(e);
        }
    }

    cmddone(err) {
        if (err) {
            logger.error("cmd run error: %j", err)
        }

        //
    }

    stop() {
        prompt.stop();
    }

    helper() {
        console.log('-------------------');
        console.group('\x1b[34m', 'Blockchain Client Commands:');
        console.log('bc', ' -- Blockchain commands');
        console.log('ac', ' -- Account management commands');
        console.log('usr', ' -- Users management commands');
        console.log('dev', ' -- IoT devices management commands');
        // etc
        console.groupEnd();
        console.log('-------------------');
    }
}

/*
    Use this method to work out the host. It is either a domain name or the external IP address.
    If the host is defined then use that data. If the host is empty then get the external IP address by pinging a seed.
*/
function resolveHost(callback, initUpdater = null) {
    try {
        if (initUpdater && config.transport && config.transport.host) {
            // validate the host is correct in the config, either it is a valid domain and IP address
            if (!libutils.is_ipaddress(config.transport.host) && !libutils.is_valid_domain(config.transport.host)) {
                return callback("Invalid host configuration value. When the host is defined it must be either a valid domain name or IP adddress");
            }
            else {
                return callback();
            }
        }

        peerclient.ping(
            (err, response) => {
                if (err) {
                    return callback(`Resolving IP address failed, error: ${err}`);
                }
                if (!response ) {
                    return callback("Resolving IP address failed, error: invalid response returned");
                }

                let data = JSON.parse(response);

                if (!data || !data.clientip || !libutils.is_ipaddress(data.clientip)){
                    return callback("Resolving IP address failed, error: invalid external IP address returned from a seed");
                }

                // the IP is returned, set the host to the IP value
                config.transport.host = data.clientip;

                callback();

                if (initUpdater) {
                    setInterval(function() {
                        resolveHost(err => {
                            if (err) {
                                logger.error(err);
                            }
                        })
                    }, interval);
                }
            }
        );
    }
    catch (e) {
        callback(`Resolving host IP address error: ${e.message}`);
    }
}

module.exports = exports = function (callback) {
    try {
        var conf = config.bcclient_config;
        if (!config.bcclient || conf.cmdinput) {
            logger.info("Config blockchain client handler -> not running");
            return callback();
        }

        // resolveHost((err) => {
        //     if (err) {
        //         return callback(err);
        //     }

            logger.info("Run streembit blockchain client handler");

            const cmd = new BcCmdHandler();
            cmd.run(callback);
        // }, 1);
    }
    catch (err) {
        callback(err.message);
    }
};
