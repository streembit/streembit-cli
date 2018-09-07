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


const config = require('libs/config');
const constants = require('libs/constants');
var { events, logger } = require('streembit-util');
var merkle = require('./merkle');


class BlockchainHandler {
    constructor() {

    }

    run(callback) {
        try {
            var conf = config.blockchain_config;
            if (!conf.run) {
                logger.info("Config blockchain handler -> not running");
                return callback();
            }
            if (!this.verifyConfig(conf)) {
                return callback();
            }

            this.registerHandlers();

            logger.info("Run blockchain handler");

            callback();
        }
        catch (err) {
            logger.error("Blockchain handler error: " + err.message);
        }
    }

    registerHandlers() {
        events.on(
            "bc_message",
            (message, req, res) => {
                let response = { result: 0, error: null };

                logger.debug('Incoming message from blockchain client, command:', message.command, message.params);

                try {
                    const { user, password, command, params } = message;
                    if (user !== config.blockchain_config.rpcuser) {
                        throw new Error('Invalid RPC user');
                    }
                    if (password !== config.blockchain_config.rpcpassword) {
                        throw new Error('Invalid RPC password');
                    }
                    if (!~constants.VALID_BLCOKCHAIN_CMDS.indexOf(command)) {
                        throw new Error('Invalid Blcokchain command');
                    }

                    response.payload = `Processing ${command} with ${params.length ? params.join(', ') : 'no'} params...`;
                    res.end(JSON.stringify(response), 'utf8');
                } catch (err) {
                    response.result = 1;
                    response.error = err.message;

                    return res.end(JSON.stringify(response), 'utf8');
                }
            }
        );
    }

    verifyConfig(conf) {
        if (!conf.rpcuser || !conf.rpcuser.length) {
            logger.error("Config blockchain handler: RPC user is not defined");
            return false;
        }
        if (!conf.rpcpassword || !conf.rpcpassword.length) {
            logger.error("Config blockchain handler: RPC password is not defined");
            return false;
        }
        if (!conf.rpcallowip || !Array.isArray(conf.rpcallowip)) {
            logger.error("Config blockchain handler: RPC allow IP list is missing");
            return false;
        }

        return true;
    }
}

module.exports = BlockchainHandler;
