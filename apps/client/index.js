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
const async = require("async");
const config = require("libs/config");
const logger = require("streembit-util").logger;
const peerutils = require("libs/peernet/peerutils");
const events = require("streembit-util").events;

module.exports = exports = function (callback) {
    try {

        config.net = constants.CLIENTNET;

        var conf = config.client_config;
        if (!conf.run) {
            return callback(null, "Config client handler -> not running");
        }

        logger.info("Run streembit client handler, net: " + config.net);

        peerutils.discovery(config.transport.host, config.seeds, function (err, host) {
            try {
                if (err) {
                    return callback(err);
                }

                config.transport.host = host;

                logger.info("Client handler started");
                callback(null, "Client module initialized");

                // process the tasks following init
                events.taskinit(constants.TASK_INFORM_CONTACTS, { all: true });

                //
            }
            catch (e) {
                callback(e.message);
            }
        });

    }
    catch (err) {
        callback(err.message);
    }
};