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
const EventEmitter = require('events');

class IoTFeature extends EventEmitter  {
    constructor(device, feature) {
        super();
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
        this.isactive = false;

        this.waiting_for_data = false;
        this.waiting_callback = 0;
        this.waiting_callback_timeout = 0;
    }

    on_datareceive_event(properties) {
    }

    on_activated(payload) {
    }

    on_device_contacting(payload) {
    }

}


module.exports = IoTFeature;