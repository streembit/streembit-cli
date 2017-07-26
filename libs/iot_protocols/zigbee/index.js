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
const IoTProtocolHandler = require("libs/iot_protocols");
const ZigbeeCommands = require("libs/iot_protocols/zigbee/commands");


class ZigbeeHandler extends IoTProtocolHandler {

    constructor(protocol, mcu) {        
        super(protocol, mcu);
        this.commandbuilder = new ZigbeeCommands();
    }

    on_neighbortable_receive(err, address64, address16, startindex, count, deviceslength, list) {
        try {
            if (err) {
                return logger.error("neighbor table receive error %j", err);
            }
            //debugger;
            //console.log("devices length: %d, startindex: %d, count: %d", deviceslength, startindex, count);
            // process the list of devices
            if (list && list.length) {
                list.forEach((item) => {
                    var device = IoTProtocolHandler.getdevice(item.address64);  // this.devices.get(item.address64);
                    if (device) {
                        device.set_details(item, true);
                    }
                });
            }

            if ((startindex + count) < deviceslength) {
                console.log("continue to read routing table from index " + (startindex + count));
                // read again from the current index
                var timeout = 5000;
                var index = (startindex + count);
                var cmd = this.commandbuilder.getRoutingTable(address64, address16, timeout, 0);
                //console.log(util.inspect(cmd));
                this.mcuhandler.send(cmd, this.on_neighbortable_receive);
            }
            else {
                logger.info("neighbor table was read, device count: " + deviceslength);
            }
        }
        catch (e) {
            logger.error("neighbor table receive exception %j", e);
        }
    }

    on_active_device(payload) {
        try {
            var address64 = payload.id;
            var device = IoTProtocolHandler.getdevice(address64);
            if (!device) {
                return logger.error("device " + address64 + " is not defined at zigbee handler");
            }

            if (device.type == constants.IOT_DEVICE_GATEWAY) {
                device.set_details({ address16: payload.address16 }, true);
                // get the routing table
                // start at 0 index
                var timeout = 5000;
                var cmd = this.commandbuilder.getRoutingTable(address64, payload.address16, timeout, 0);
                //console.log(util.inspect(cmd));
                this.mcuhandler.send(cmd, this.on_neighbortable_receive);
            }

            super.on_active_device(payload);
        }
        catch (e) {
            logger.error("on_active_device exception %j", e);
        }
    }

    init() {
        try {
            super.init();         

            this.mcuhandler.init();
            this.mcuhandler.monitor();
        }
        catch (err) {
            logger.error("zigbee handler init error: " + err.message);
        }
    }

    
}

module.exports = ZigbeeHandler;

