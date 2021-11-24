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

import async from "async";
import { seed } from "./seed/index.js"
import { default as client } from "./client/index.js";
import { IoTRunner as iot }from "./iot/index.js";
import { BlockchainHandler } from "./blockchain/index.js";
import * as dnshandler from "./dns/index.js";
import { CmdHandler } from "./cmd/index.js";
import { default as bcclient } from "./bcclient/index.js";

// const bcclient = require("./bcclient");

export class ModulesHandler {
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

// module.exports = ModulesHandler;
