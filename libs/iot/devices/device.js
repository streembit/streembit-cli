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

class Device {

    constructor(id, device, cmdbuilder, transport) {
        this.id = id;
        this.type = device.type;
        this.protocol = device.protocol;
        this.profile = device.profile;
        this.settings = device.setting;
        this.details = 0;

        this.command_builder = cmdbuilder;
        this.transport = transport;

        this.m_active = false;
    }

    get_report() {
    }


    get active() {
        return this.m_active;
    }

    set active(value) {
        this.m_active = value;
    }

    on_active_device() {
    }

    set_details(data, isactive) {
        this.details = data;
        this.active = isactive;
        
        if (isactive) {
            this.on_active_device();
        }
        logger.debug("device " + this.id + " is active");
    }

    executecmd(payload, callback) {
        switch (payload.cmd) {
            case constants.IOTCMD_TOGGLE:
                this.toggle(callback);
                break;
            case constants.IOTCMD_READSWITCH:
                this.read(callback);
                break;
            default:
                callback("invalid command");
                break;
        }
    }
}


module.exports = Device;