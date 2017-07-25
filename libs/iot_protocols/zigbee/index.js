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

class Handler {

    constructor(mcu) {
        this.mcu = mcu;
        this.mcuhandler = 0;
    }

    executecmd(payload){
        this.mcuhandler.executecmd(payload );
    }

    handle_request(message, callback) {
        this.mcuhandler.handle_request(message, callback );
    }

    init(callback) {
        try {
            logger.info("zigbee init mcu: " +  this.mcu);
            
            var mcu_handler = require('libs/iot_protocols/zigbee/' + this.mcu);
            mcu_handler.init();
            mcu_handler.monitor();

            this.mcuhandler = mcu_handler;

            //         
        }
        catch (err) {
            logger.error("zigbee handler init error: " + err.message);
        }
    }

    
}

module.exports = Handler;

