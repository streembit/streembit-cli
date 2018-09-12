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
const logger = require("streembit-util").logger;
const PeerClient = require("libs/peernet/peerclient");

const peerclient = new PeerClient();

class BcCmdHandler {
    constructor() {
        this.rpcuser = config.bcclient.rpcuser.replace(/[^a-z0-9_\-]/ig,'');
        this.rpcpassword = config.bcclient.rpcpassword.replace(/[^a-z0-9_#!\?\+_\(\)\.\*&\$%@\-]/ig,'');
        this.rpcport = parseInt(config.bcclient.rpcport) || constants.DEFAULT_STREEMBIT_PORT;
        this.rpchost = constants.DEFAULT_STREEMBIT_HOST;

        this.command = String(config.bcclient.args[0]).trim();
        this.params = config.bcclient.args.splice(1);

        this.preValidate();
    }

    preValidate() {
        if (this.rpcuser.length < 2 || this.rpcpassword < 4) {
            console.error('Invalid RPC credentials. Please, check rpcuser and rpcpassword values');
            process.exit(1);
        }

        if (!~constants.VALID_BLCOKCHAIN_CMDS.indexOf(this.command)) {
            this.command = 'help';
            this.params = [];
        }

        return true;
    }

    execute(callback = () => {}) {
        try {
            const reqBody = {
                user: this.rpcuser,
                password: this.rpcpassword,
                command: this.command,
                params: this.params || []
            };

            const reqDestination = {
                host: this.rpchost,
                port: this.rpcport
            };

            peerclient.bcclient(reqBody, reqDestination, (err, resp) => {
                const { result, error, payload } = JSON.parse(resp);

                if (err || error || result > 0) {
                    throw new Error(err ? err.message : error || 'invalid response result');
                }

                console.log(payload);
            });

            callback();
        } catch (err) {
            callback('Blockchain client handler error: ' + err.message);
        }
    }
}

module.exports = exports = function (callback) {
    try {
        if (!config.bcclient) {
            logger.info("Config blockchain client handler -> not running");
            return callback();
        }

        logger.info("Run streembit blockchain client handler");

        const cmd = new BcCmdHandler();
        cmd.execute(callback);
    }
    catch (err) {
        callback(err.message);
    }
};
