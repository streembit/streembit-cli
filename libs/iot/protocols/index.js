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

class IoTProtocolHandler {
    constructor(protocol, mcu) {
        this.protocol = protocol;
        this.mcu = mcu;
        this.initialized = false;
        this.mcuhandler = 0;

        var handler = 0;
        try {
            var lib = 'libs/iot/protocols/' + this.protocol + '/' + this.mcu;
            handler = require(lib);
        }
        catch (err) {
            throw new Error("MCU library " + this.mcu + " error: " + err.message);
        }

        if (!handler) {
            throw new Error("handler for MCU " + this.mcu + " is missing");
        }
        this.mcuhandler = new handler();
    }

    init() {        
    }
}

module.exports = IoTProtocolHandler;
