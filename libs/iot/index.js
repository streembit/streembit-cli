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

var config = require("libs/config");
var logger = require("libs/logger");
var devicelist = require('libs/iot/devicelist');
const events = require("libs/events");

class IoTHandler {
    constructor() {
    }

    init() {
        try {
            var conf = config.iot_config;
            if (!conf.run) {
                return logger.debug("Don't run IoT handler");
            }

            logger.info("Run IoT handler");

            devicelist.init();

            // initialize the IoT device handlers Zigbee, Z-Wave, 6LowPan, etc.
            var protocols = config.iot_config.protocols;
            protocols.forEach(function (item) {
                logger.info("create protocol " + item.name + " handler");
                var ProtocolHandler = require("libs/iot_protocols/" + item.name);
                var handler = new ProtocolHandler(item.chipset);
                if ( !handler.init) {
                    logger.error("handler for " + item + " not exists");
                }
                handler.init();
            });

            events.on(events.TYPES.ONIOTEVENT, (event, payload) => {
                switch (event) {
                    case "active_device_found":
                        var id = payload.id;
                        devicelist.update(id, true);
                        break;
                    case "device_command":

                        break;
                    default:
                        break;
                }
            });

        }
        catch (err) {
            logger.error("IoT handler error: " + err.message);
        }
    }
}

module.exports = IoTHandler; 

