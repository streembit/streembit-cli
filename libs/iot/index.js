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
const config = require("libs/config");
const logger = require("libs/logger");
const events = require("libs/events");
const WebSocket = require("libs/websocket");


class IoTHandler {
    constructor() {
        this.protocol_handlers = 0;
    }

    get_handler_by_id(id) {
        if (!id) {
            throw new Error("invalid device ID");
        }

        var protocol;
        var devices = config.iot_config.devices;
        devices.forEach(function (item) {
            if (item.id == id) {
                protocol = item.protocol;
            }
        });

        if (!protocol) {
            throw new Error("protocol for id " + id + " does not exists");
        }

        var handler = this.protocol_handlers.get(protocol);
        if (!handler) {
            throw new Error("handler for protocol " + protocol + " does not exists");
        }

        return handler;
    }


    init() {
        try {
            var conf = config.iot_config;
            if (!conf.run) {
                return logger.debug("Don't run IoT handler");
            }

            logger.info("Run IoT handler");

            this.protocol_handlers = new Map();

            //devicelist.init();

            // initialize the IoT device handlers Zigbee, Z-Wave, 6LowPan, etc.
            var protocols = conf.protocols;
            protocols.forEach( (item) => {
                logger.info("create protocol " + item.name + " handler");
                var ProtocolHandler = require("libs/iot_protocols/" + item.name);
                var handler = new ProtocolHandler(item.name, item.chipset);
                if (!handler.init) {
                    logger.error("handler for " + item + " not exists");
                }
                handler.init();
                this.protocol_handlers.set(item.name, handler);
            });

            events.on(events.TYPES.ONIOTEVENT, (event, payload, callback) => {
                try {
                    switch (event) {
                        case constants.IOTREQUEST:
                            var handler = this.get_handler_by_id(payload.id);
                            if (!handler && !handler.handle_request) {
                                throw new Error("invalid IOTREQUEST handler");
                            }
                            handler.handle_request(payload, callback);                           
                            break;
                        case constants.IOTACTIVITY:
                            var handler = this.get_handler_by_id(payload.id);                           
                            if (handler && handler.on_iot_activity) {
                                handler.on_iot_activity(payload);
                            }
                            break;
                        default:
                            break;
                    }
                }
                catch (err) {
                    callback(err.message);
                    logger.error("ONIOTEVENT error: " + err.message);                    
                }
            });

            // start the websocket server
            var port = conf.wsport ? conf.wsport : 32318;
            var wsserver = new WebSocket(port);
            wsserver.init();

        }
        catch (err) {
            logger.error("IoT handler error: " + err.message);
        }
    }
}

module.exports = IoTHandler; 

