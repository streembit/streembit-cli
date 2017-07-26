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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const logger = require("libs/logger");
const events = require("libs/events");
const config = require('libs/config');
const constants = require("libs/constants");
const GatewayDevice = require('libs/iot/devices/gateway_device');
const SwitchDevice = require('libs/iot/devices/switch_device');
const SmartPlug = require('libs/iot/devices/smartplug_device');


const UNDEFINED = 0

var DeviceTypeMap = {
    1: GatewayDevice,
    2: SwitchDevice,
    3: SmartPlug,
    4: UNDEFINED,
    5: UNDEFINED,
    6: UNDEFINED,
    7: UNDEFINED,
    8: UNDEFINED,
    9: UNDEFINED,
    10: UNDEFINED,
    11: UNDEFINED,
    12: UNDEFINED,
    13: UNDEFINED,
    14: UNDEFINED,
    15: UNDEFINED,
    16: UNDEFINED,
    17: UNDEFINED,
    18: UNDEFINED,
    19: UNDEFINED,
    20: UNDEFINED
};


class IoTProtocolHandler {

    constructor(protocol, mcu) {
        this.protocol = protocol;
        this.mcu = mcu;
        this.mcuhandler = 0;
        this.devices = new Map();
    }

    executecmd(payload) {
        this.mcuhandler.executecmd(payload);
    }

    handle_request(message, callback) {
        this.mcuhandler.handle_request(message, callback);
    }

    device_factory (device) {
        //debugger;
        // the type must be the correct one in the config.js file
        var device_instance = DeviceTypeMap[device.type];
        if (!device_instance) {
            throw new Error("Device type " + device.type + " is not implemented. Provide the correct configuration settings in the config.js file.");
        }

        return new device_instance(device.id, device);
    }

    init(callback) {
        try {
            logger.info("init protocol: " + this.protocol + " mcu: " + this.mcu);

            var devices = config.iot_config.devices;
            devices.forEach((device) => {
                if (device.protocol == this.protocol) {
                    console.log("adding " + this.protocol + " device" );
                    var device_obj = this.device_factory(device);
                    this.devices.set(device.id, device_obj);
                }
            });

            this.mcu_handler.init();
            this.mcu_handler.monitor();

            //         
        }
        catch (err) {
            logger.error("IoTProtocolHandler init error: " + err.message);
        }
    }
}

module.exports = IoTProtocolHandler;
