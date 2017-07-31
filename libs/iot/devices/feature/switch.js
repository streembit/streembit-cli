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
const iotdefinitions = require("libs/iot/definitions");
const IoTFeature = require("./feature");
const events = require("libs/events");
const logger = require("libs/logger");

class SwitchFeature extends IoTFeature {

    constructor(device, feature) {
        super(device, feature);  
        this.switchstatus = 0;        
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_SWITCH_STATUS) {
                        this.switchstatus = item.value;
                        logger.debug("switch status: " + item.value);
                    }
                }
            );
        }
        catch (err) {
            logger.error("SwitchFeature on_datareceive_event() error: %j", err);
        }
    }

    on_device_contacting(payload) {
        //debugger;
        console.log("on_device_contacting() call get_switchstatus()");
        this.get_switchstatus();
    }

    on_activated(payload) {
        try {
            debugger;
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
        try {
            var transport = this.device.transport;
            var commandbuilder = this.device.command_builder;
            var device_details = this.device.details;
            var cmd = commandbuilder.readSwitchStatus(device_details, 3000);
            transport.send(cmd, (err, value) => {
                if (err) {
                    if (callback) {
                        callback(err);
                    }
                    return logger.error("switch status read error %j", err);
                }

                this.switchstatus = value;
                logger.debug("switch status: " + value);
                if (callback) {
                    callback(null, value);
                }

                //
            });
        }
        catch (err) {
            logger.error("get_switchstatus() error %j", err);
        }
    }

}

module.exports = SwitchFeature;