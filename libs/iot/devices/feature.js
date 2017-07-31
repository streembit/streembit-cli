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


const events = require("libs/events");
const logger = require('libs/logger');
const constants = require("libs/constants");

class IoTFeature {
    constructor(device, feature) {
        if (!device) {
            throw new Error("IoTFeature constructor error: Invalid device ID");
        }
        this.device = device;
        if (!device.id) {
            throw new Error("IoTFeature constructor error: Invalid device ID");
        }
        this.deviceid = device.id;  // parent id, in case if Zigbee this is the address64 as well
        this.type = feature.function;
        this.settings = feature.setting;

        //this.get_transportfn = transportfn;
        //this.get_cmdbuilderfn = cmdbuilderfn;
        //this.get_devicedetailsfn = detailsfn;

        /*
        this.address64 = 0;
        this.address16 = 0;

        this.command_builder = cmdbuilder;
        this.transport = transport;
        */

        this.isactive = false;
    }

    on_datareceive_event(payload) {
    }

    on_activated(payload) {
        //this.address64 = payload.address64;
        //this.address16 = payload.address16;
        //if (payload.address64) {
        //    this.isactive = true;
        //}
    }

    on_device_contacting(payload) {
        //this.address64 = payload.address64;
        //this.address16 = payload.address16;
        //if (payload.address64) {
        //    this.isactive = true;
        //}
    }

    create_event_handlers() {
    }
}


module.exports = IoTFeature;