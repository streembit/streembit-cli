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
const IoTFeature = require("./feature");
const events = require("libs/events");
const logger = require("libs/logger");

class SwitchFeature extends IoTFeature {

    constructor(id, device, cmdbuilder, transport) {
        super(id, device, cmdbuilder, transport);      

        this.last_switch_time = 0;
        this.status = 0;

        logger.debug("initialized a switch measurement for deviceid: " + id);
    }

    on_activated(payload) {
        try {
            //debugger;
            super.on_activated(payload);

            // get the switch status
            this.get_switchstatus();
        }
        catch (err) {
            logger.error("SwitchFeature on_activated error %j", err);
        }
    }

    toggle(callback) {
        this.exec_toggle_switch();

        setTimeout(
            () => {
                this.read(callback);
            },
            500
        );
    }

    read(callback) {
        this.get_switchstatus((err, value) => {
            if (err) {
                return callback(err);
            }

            var result = {
                payload: {
                    switch_status: value
                }
            };
            callback(null, result);

            //
        });
    }

    exec_toggle_switch() {
        var cmd = this.command_builder.execToggleSwitch(this.address64, this.address16);
        this.transport.send(cmd);
    }

    get_switchstatus(callback) {

        var cmd = this.command_builder.readSwitchStatus(this.address64, this.address16, 3000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                if (callback) {
                    callback(err);
                }
                return logger.error("switch status read error %j", err);
            }

            this.status = value;
            logger.debug("switch status: " + value);
            if (callback) {
                callback(null, value);
            }

            //
        });
    }

}

module.exports = SwitchFeature;