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
const SwitchFeature = require("../switch");
const events = require("libs/events");
const logger = require("libs/logger");

class ZigbeeSwitchFeature extends SwitchFeature {

    constructor(device, feature) {
        super(device, feature);  

        logger.debug("Initialized a Zigbee switch measurement for deviceid: " + this.deviceid );        
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
                        //logger.debug("switch status: " + item.value);
                        this.emit((iotdefinitions.ZIGBEE + iotdefinitions.PROPERTY_SWITCH_STATUS), item.value);
                    }
                }
            );
        }
        catch (err) {
            logger.error("SwitchFeature on_datareceive_event() error: %j", err);
        }
    }

    on_device_contacting(payload) {
        this.get_switchstatus();
    }

    on_activated(payload) {
        try {
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

    exec_toggle_switch() {
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.execToggleSwitch(device_details, 3000);
        transport.send(cmd);
    }

    get_switchstatus() {
        try {
            var transport = this.device.transport;
            var commandbuilder = this.device.command_builder;
            var device_details = this.device.details;
            var cmd = commandbuilder.readSwitchStatus(device_details, 3000);
            transport.send(cmd);
        }
        catch (err) {
            logger.error("get_switchstatus() error %j", err);
        }
    }

    read(callback) {

        try {
            if (callback) {
                let status_processed = false;
                let proctimer = 0;
                let result = {
                    payload: {
                        switch_status: -1
                    }
                };

                let complete = function () {
                    if (status_processed) {
                        callback(null, result);
                        if (proctimer) {
                            clearTimeout(proctimer);
                        }
                    }
                }

                this.once((iotdefinitions.ZIGBEE + iotdefinitions.PROPERTY_SWITCH_STATUS), (value) => {
                    try {
                        result.payload.switch_status = value;
                        status_processed = true;
                        callback(null, result);
                        if (proctimer) {
                            clearTimeout(proctimer);
                        }
                    }
                    catch (err) {
                        logger.error("ZigbeeSwitchFeature read() 'once' event handler error %j", err);
                    }
                });

                proctimer = setTimeout(
                    () => {
                        if (!status_processed) {
                            this.removeAllListeners((iotdefinitions.ZIGBEE + iotdefinitions.PROPERTY_SWITCH_STATUS));
                            callback(constants.IOT_ERROR_TIMEDOUT);
                        }
                    },
                    6000
                );
            }

            // do the reading
            this.get_switchstatus();

            //
        }
        catch (err) {
            callback(err);
        }
    }

    configure() {
    }
}

module.exports = ZigbeeSwitchFeature;