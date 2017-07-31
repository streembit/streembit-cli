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

    //on_device_found(payload) {
    //    try {
    //        //debugger;
    //        if (!payload) {
    //            return logger.error("ZigbeeHandler on_device_found error, invalid payload");
    //        }

    //        if (!payload.id) {
    //            return logger.error("ZigbeeHandler on_device_found error, invalid payload ID");
    //        }

    //        var device = IoTProtocolHandler.getdevice(payload.id);
    //        if (!device) {
    //            return logger.error("device " + payload.id + " is not defined at zigbee handler");
    //        }

    //        if (payload.hasOwnProperty('address64')) {
    //            device.update_property("address64", payload.address64);
    //        }
    //        if (payload.hasOwnProperty('address16')) {
    //            device.update_property("address16", payload.address16);
    //        }

    //        if (device.type == constants.IOT_DEVICE_GATEWAY) {
    //            //device.update_property("address16", payload.address16);
    //            device.update_active(true);
    //        }
    //        else {
    //            // the simple descriptor response was received -> the device is active
    //            device.on_active_device(payload);
    //        }

    //        // end of procedure, don't call the super, the event is handled here
    //    }
    //    catch (e) {
    //        logger.error("on_active_device exception %j", e);
    //    }
    //}

    init() {
        try {
            //debugger;
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

