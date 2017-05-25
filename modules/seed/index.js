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

const async = require("async");
const config = require("libs/config");
const logger = require("libs/logger");
const db = require("libs/database");
const kad = require("libs/peernet/kad");
const Account = require("libs/account");

module.exports = exports = function (callback) {
    try {
        var conf = config.seed_config;
        if (!conf.run) {
            logger.debug("Don't run seed handler");
            return callback();
        }

        async.waterfall(
            [
                function (cb) {
                    var account = new Account();
                    account.init(cb)
                },
                function (cb) {
                    var kadnet = new kad.KadHandler();
                    kadnet.init(cb);
                }
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }

                logger.info("Run seed handler");
                callback();
            }
        );

    }
    catch (err) {
        callback(err.message);
    }
};