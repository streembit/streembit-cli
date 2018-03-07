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
const iot = require("./iot");
const BlockchainHandler = require("./blockchain");
const CmdHandler = require("./cmd");
const async = require('async');

class ModulesHandler {
    constructor() {
    }

    init(callback) {
        async.series(
            [
                async.reflect(function (callback) {
                    seed(callback);
                }),
                async.reflect(function (callback) {
                    client(callback);
                }),
                async.reflect(function (callback) {
                    iot.run(callback);
                }),
                async.reflect(function (callback) {
                    var blockchain = new BlockchainHandler();
                    blockchain.run(callback);
                }),
                async.reflect(function (callback) {
                    const cmd = new CmdHandler();
                    cmd.run(callback);
                })
            ],
            function (err, results) {
                results.forEach(
                    (res) => {
                        if (res.error) {
                            logger.error(res.error);
                        }
                        else {
                            logger.info(res.value);
                        }
                    }
                );

                callback();
            }
        );
    }
}


module.exports = ModulesHandler;

