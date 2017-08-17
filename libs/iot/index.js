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
const util = require("util");
const Devices = require("libs/devices")
const ZigbeeGateway = require('libs/iot/device/zigbee/gateway');
const ZigbeeDevice = require('libs/iot/device/zigbee/device');
const iotdefinitions = require("libs/iot/definitions");

class IoTHandler {
    constructor() {
        this.protocol_handlers = new Map();
    }

    getdevice(id) {
        return Devices.instances.get(id);
    }

    setdevice(id, instance) {
        Devices.instances.set(id, instance);
    }

    getdeviceobj(type, protocol) {
        if (type == constants.IOT_DEVICE_GATEWAY) {
            if (protocol == constants.IOT_PROTOCOL_ZIGBEE) {
                return ZigbeeGateway;
            }
        }
        else if (type == constants.IOT_DEVICE_ENDDEVICE) {
            if (protocol == constants.IOT_PROTOCOL_ZIGBEE) {
                return ZigbeeDevice;
            }
        }
    }

    device_factory(device) {
        // the type must be the correct one in the config.js file
        var device_instance = this.getdeviceobj(device.type, device.protocol);
        if (!device_instance) {
            throw new Error("Device type " + device.type + " is not implemented. Provide the correct configuration settings in the config.js file.");
        }

        var protocolhandler = this.protocol_handlers.get(device.protocol);
        return new device_instance(device.deviceid, device, protocolhandler.mcuhandler);
    }

    init() {
        try { 
            var conf = config.iot_config;
            if (!conf.run) {
                return logger.debug("Don't run IoT handler");
            }

            logger.info("Run IoT handler");

            // initialize the IoT device handlers Zigbee, Z-Wave, 6LowPan, etc.
            var protocols = conf.protocols;
            for (let i = 0; i < protocols.length; i++) {
                logger.info("create protocol " + protocols[i].name + " handler");
                let ProtocolHandler = require("libs/iot/protocols/" + protocols[i].name);
                let handler = new ProtocolHandler(protocols[i].name, protocols[i].chipset);
                this.protocol_handlers.set(protocols[i].name, handler);             
            };
         
            const devices = Devices.list();
            for (let i = 0; i < devices.length; i++) {
                let device = this.device_factory(devices[i]);
                device.init();
                this.setdevice(devices[i].deviceid, device);
            }

            // create the event handlers
            this.handle_events();

            // start the websocket server
            var port = conf.wsport ? conf.wsport : 32318;
            var wsserver = new WebSocket(port);
            wsserver.init();

            // initiaize the transports
            this.protocol_handlers.forEach(
                (handler, protocol) => {
                    try {
                        handler.init();
                    }
                    catch (err) {
                        logger.error("IoT " + protocol + " handler error: " + err.message);
                    }
                }
            );
        }
        catch (err) {
            logger.error("IoT handler error: " + err.message);
        }
    }


    handle_events() {

        // events from Streembit users
        events.on(events.TYPES.ONIOTEVENT, (event, payload, callback) => {
            try {
                if (event == constants.IOTREQUEST) {
                    var device = this.getdevice(payload.id);
                    if (!device) {
                        throw new Error("device for id " + id + " does not exists at the gateway");
                    }
                    device.executecmd(payload, callback);
                }
            }
            catch (err) {
                if (callback) {
                    callback(err.message);
                }
                logger.error("ONIOTEVENT error: " + err.message);
            }
        });

        // events from the protocol transports
        events.on(
            iotdefinitions.IOT_DATA_RECEIVED_EVENT,
            (payload) => {
                try {
                    var device = this.getdevice(payload.deviceid);
                    if (device) {
                        device.on_data_received(payload);
                    }
                }
                catch (err) {
                    logger.error("IoTHandler IOT_DATA_RECEIVED_EVENT error: %j", err);
                }
            }
        );
    }
}

module.exports = IoTHandler; 

