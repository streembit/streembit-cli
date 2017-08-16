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
const constants = require("libs/constants");
const async = require("async");
const util = require('util');
const IoTProtocolHandler = require("libs/iot/protocols");
const Devices = require("libs/devices");
const iotdefinitions = require("libs/iot/definitions");


class ZigbeeHandler extends IoTProtocolHandler {

    constructor(protocol, mcu) {        
        super(protocol, mcu);
    }

    create_event_handlers() {
        var device_datareceived_event = iotdefinitions.IOT_DATA_RECEIVED_EVENT;
        events.on(
            device_datareceived_event,
            (payload) => {
                var device = IoTProtocolHandler.getdevice(payload.deviceid);
                if (device) {
                    device.on_data_received(payload);
                }               
            }
        );
    }

    init() {
        try {
            logger.info("init protocol: " + this.protocol + " mcu: " + this.mcu);
         
            this.create_handler();

            var devices = Devices.get_devices_by_protocol(this.protocol);
            for (let i = 0; i < devices.length; i++) {
                let device = this.device_factory(devices[i]);
                device.init();
                let map_of_devices = IoTProtocolHandler.devices;
                map_of_devices.set(devices[i].deviceid, device);
            }

            // event handlers
            this.create_event_handlers();

            this.mcuhandler.init();
            this.mcuhandler.monitor();

            this.initialized = true;            
        }
        catch (err) {
            throw new Error("Zigbee protocol handler init error: " + err.message);
        }
    }

    
}

module.exports = ZigbeeHandler;

