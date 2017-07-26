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
const TempHumidDevice = require('libs/iot/devices/temphumidity_device');


const UNDEFINED = 0

var DeviceTypeMap = {
    1: GatewayDevice,
    2: SwitchDevice,
    3: SmartPlug,
    4: TempHumidDevice,
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


let iotdevices = 0;

class IoTProtocolHandler {

    constructor(protocol, mcu) {
        this.protocol = protocol;
        this.mcu = mcu;      
        this.mcuhandler = 0;
        this.commandbuilder = 0;
        iotdevices = new Map();
    }

    static getdevice(id) {
        return iotdevices.get(id);
    }

    create_handler() {
        var handler = 0;
        try {
            var lib = 'libs/iot_protocols/zigbee/' + this.mcu;
            handler = require(lib);
        }
        catch (err) {
            throw new Error("MCU library " + this.mcu + " error: " + err.message);
        }

        if (!handler) {
            throw new Error("handler for MCU " + this.mcu + " is missing");
        }
        this.mcuhandler = handler;
    }

    on_active_device(payload) {
    }

    on_iot_activity(payload) {
        var type = payload.type;
        switch (type) {
            case constants.ACTIVE_DEVICE_FOUND:
                this.on_active_device(payload);
                break;
            default:
                break;
        }
    }


    handle_request(message, callback) {
        //this.mcuhandler.handle_request(message, callback);
        try {
            // get the device
            var device = IoTProtocolHandler.getdevice(message.id);
            if (!device) {
                throw new Error("device for id " + id + " does not exists at the gateway");
            }

            device.executecmd(message, callback);

            //
        }
        catch (err) {
            callback(err);
        }
    }

    device_factory (device) {
        // the type must be the correct one in the config.js file
        var device_instance = DeviceTypeMap[device.type];
        if (!device_instance) {
            throw new Error("Device type " + device.type + " is not implemented. Provide the correct configuration settings in the config.js file.");
        }

        return new device_instance(device.id, device, this.commandbuilder, this.mcuhandler);
    }

    geteventfn(type) {
        return this.eventfns.get(type);
    }

    init() {
        logger.info("init protocol: " + this.protocol + " mcu: " + this.mcu);

        this.create_handler();

        var devices = config.iot_config.devices;
        devices.forEach((item) => {
            if (item.protocol == this.protocol) {
                console.log("adding " + this.protocol + " device" );
                var device_obj = this.device_factory(item);
                iotdevices.set(item.id, device_obj);
            }
        });
    }
}

module.exports = IoTProtocolHandler;
