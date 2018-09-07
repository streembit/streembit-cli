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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


const logger = require("streembit-util").logger;
const seed = require("./seed");
const client = require("./client");
const bcclient = require("./bcclient");
const iot = require("./iot");
const BlockchainHandler = require("./blockchain");
const BlockchainCmdsHandler = require("./blockchain/cmds");
const CmdHandler = require("./cmd");
const dnshandler = require("./dns");
const async = require('async');


class ModulesHandler {
    constructor() {
    }

    init(callback) {
        async.waterfall(
            [
                function (callback) {
                    seed(callback);
                },
                function (callback) {
                    client(callback);
                },
                function (callback) {
                    iot.run(callback);
                },
                function (callback) {
                    const blockchain = new BlockchainHandler();
                    blockchain.run(callback);
                },
                function (callback) {
                    dnshandler.run(callback);
                },
                function (callback) {
                    bcclient(callback);
                },
                function (callback) {
                    const cmd = new CmdHandler();
                    cmd.run(callback);
                }
            ],
            function (err) {
                callback(err);
            }
        );
    }
}

module.exports = ModulesHandler;
