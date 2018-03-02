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


const merkle = require("./merkle");
const config = require("libs/config");
const logger = require("streembit-util").logger;
const prompt = require("prompt");


class BlockchainHandler {
    constructor() {}

    run(callback) {
        try {
            const conf = config.blockchain_config;
            if (!conf.run) {
                return callback(null, "Config blockchain handler -> not running");
            }

            logger.info("Run blockchain handler");

            this.init();

            callback();
        }
        catch (err) {
            logger.error("Blockchain handler error: " + err.message);
        }
    }

    init() {
        // show the prompt for commands type
        var schema = {
            properties: {
                cmd: {
                    description: 'Enter commands type',
                    type: 'string',
                    pattern: /^\w{2,4}$/,
                    message: 'Invalid commands type',
                    required: true
                },
            }
        };

        this.bc_prompt(schema, null, result => {
            switch (result.cmd) {
                case 'bc':
                    this.blockchain_calls();
                    break;
                default:
                    this.init();
                    break;
            }
        });
    }

    blockchain_calls() {
        // show the prompt for actual command
        var schema = {
            properties: {
                cmd: {
                    description: 'Enter blockchain command',
                    type: 'string',
                    pattern: /^[a-z 0-9]{2,60}$/i,
                    message: 'Invalid command',
                    required: true
                },
            }
        };

        this.bc_prompt(schema, null, result => {
            try {
                const cmd_r = result.cmd.split(' ');
                switch (cmd_r[0]) {
                    case 'getinfo':
                        console.log('you have requested getinfo');
                    default:
                        this.blockchain_calls();
                        break;
                }
            } catch (err) {
                console.error("Command line interface error: " + err.message);
                logger.error("Command line interface error: " + err.message);
            }
        });
    }

    bc_prompt(schema, message, callback) {
        if (!schema || typeof schema !== 'object' || typeof schema.properties !== 'object') {
            throw new Error('Invalid schema');
        }
        if (typeof callback !== 'function') {
            throw new Error('Callback is not a function');
        }

        prompt.message = message || "";

        prompt.start();

        prompt.get(schema, function (err, result) {
            if (err) {
                console.error("Command line interface error: " + err.message);
                logger.error("Command line interface error: " + err.message);
            }

            callback(result);
        });
    }
}

module.exports = BlockchainHandler;