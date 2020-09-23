﻿/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const constants = require("libs/constants");
const async = require("async");
const util = require('util');
const IoTProtocolHandler = require("apps/iot/protocols");
const Devices = require("libs/devices");
const iotdefinitions = require("apps/iot/definitions");
const zigbeecmd = require("apps/iot/protocols/zigbee/commands");

class ZigbeeHandler extends IoTProtocolHandler {

    constructor(protocol, mcu) {        
        super(protocol, mcu);
    }

    init() {
        try {
            logger.info("init protocol: " + this.protocol + " mcu: " + this.mcu);         
            this.mcuhandler.init();
            //this.mcuhandler.monitor();
            this.initialized = true;            
        }
        catch (err) {
            throw new Error("Zigbee protocol handler init error: " + err.message);
        }
    }    

    on_gateway_updated(payload) {
        zigbeecmd.on_gateway_updated(payload);
    }

    dotasks() {
        this.mcuhandler.dotasks();
    }
}

module.exports = ZigbeeHandler;

