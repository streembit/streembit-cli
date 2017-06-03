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


const constants = require("libs/constants");
const async = require("async");
const config = require("libs/config");
const logger = require("libs/logger");
const peerutils = require("libs/peernet/peerutils");
const kad = require("libs/peernet/kad");
const Account = require("libs/account");
const msghandler = require("libs/peernet/msg");
const events = require("libs/events");
const Contacts = require("libs/contacts");

function process_tasks() {
    try {
        events.taskinit(constants.TASK_INFORM_CONTACTS, { all: true });
    }
    catch (err) {
        logger.error("process_tasks error: %j", err);
    }
}

module.exports = exports = function (callback) {
    try {

        config.net = constants.CLIENTNET;

        var conf = config.client_config;
        if (!conf.run) {
            logger.debug("Don't run streembit client handler");
            return callback();
        }

        logger.info("Run streembit client handler, net: " + config.net );

        async.waterfall(
            [
                function (cb) {
                    try {
                        var account = new Account();
                        account.init(cb)
                    }
                    catch (e) {
                        cb(e);
                    }
                },
                function (cb) {
                    try {
                        peerutils.discovery(config.host, config.seeds, cb)
                    }
                    catch (e) {
                        cb(e);
                    }
                },
                function (host, cb) {
                    try {
                        config.host = host;
                        var contacts = new Contacts();
                        contacts.init(cb);
                    }
                    catch (e) {
                        cb(e.message);
                    }
                }
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }

                logger.info("Client handler started");
                callback();

                // process the tasks following init
                process_tasks();
            }
        );

    }
    catch (err) {
        callback(err.message);
    }
};