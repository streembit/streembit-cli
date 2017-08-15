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


const constants = require("libs/constants");
const Device = require("libs/iot/device/device");
const events = require("libs/events");
const logger = require("libs/logger");
const iotdefinitions = require("libs/iot/definitions");

class ZwaveGateway extends Device {

    constructor(id, device, cmdbuilder, transport) {
        try {
            super(id, device, cmdbuilder, transport);
            logger.debug("initializing ZwaveGateway device");
        }
        catch (err) {
            throw new Error("ZwaveGateway constructor error: " + err.message);
        }
    }

    create_event_handlers() {       
    }

}

module.exports = ZwaveGateway;