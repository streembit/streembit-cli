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


var config = require("libs/config");
var { events, logger } = require("streembit-util");
var merkle = require("./merkle");


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
                const m_json = JSON.stringify(message);

                console.log('BC message\'s here:', m_json);
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
