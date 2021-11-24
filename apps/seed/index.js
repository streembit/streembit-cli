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

var streembit = streembit || {};

import async from "async";
import { config } from '../../libs/config/index.js';
import { constants } from "../../libs/constants/index.js";
import * as msghandler from "../../libs/peernet/msg.js";
import { KadHandler } from "../../libs/peernet/kad.js";
import { logger } from 'streembit-util';

export function seed(callback) {
    try {

        config.net = constants.KADNET;

        var conf = config.seed_config;
        if (!conf.run) {
            logger.info("Config seed handler -> not running");
            return callback();
        }

        async.waterfall(
            [
                function (cb) {
                    try {
                        var options = {
                            seeds: config.seeds,
                            onKadMessage: msghandler.on_kad_message,
                            onTransportError: msghandler.on_transport_error,
                            peermsgrcv: msghandler.on_peer_message
                        };

                        var kadnet = new KadHandler();
                        kadnet.init(options, cb);
                    }
                    catch (e) {
                        callback(e.message);
                    }
                }
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }

                logger.info("Seed handler started");
                callback();
            }
        );

    }
    catch (err) {
        callback(err.message);
    }
};