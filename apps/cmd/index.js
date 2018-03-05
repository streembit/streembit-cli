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


const logger = require('streembit-util').logger;
const config = require('libs/config');
const BlockchainHandler = require('../blockchain');
const prompt = require('prompt');


class CmdHandler {
    constructor() {}

    run(callback) {
        try {
            logger.info("Run CMD input handler");

            const schema = {
                properties: {
                    cmd: {
                        description: 'Enter commands type',
                        type: 'string',
                        pattern: /^\w{2,10}$/,
                        message: 'Invalid commands type',
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
                        prompt.stop();
                        return callback();
                    }

                    return callback(err);
                }

                try {
                    switch (result.cmd) {
                        case 'bc':
                            const blockchain = new BlockchainHandler(this, callback);
                            blockchain.run();
                            break;
                        default:
                            this.helper();
                            this.run(callback);
                            break;
                    }
                } catch (e) {
                    callback(e);
                }
            });
        }
        catch (err) {
            callback("CMD handler error: " + err.message);
        }
    }

    helper() {
        console.log('-------------------');
        console.group('\x1b[34m', 'Streembit Commands:');
        console.log('bc', '-- Blockchain commands');
        console.log('account', '-- User accounts commands');
        // etc
        console.groupEnd();
        console.log('-------------------');
    }
}

module.exports = CmdHandler;