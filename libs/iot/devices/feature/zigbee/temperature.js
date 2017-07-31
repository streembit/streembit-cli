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
const TemperatureFeature = require("../temperature");
const events = require("libs/events");
const logger = require("libs/logger");
const util = require('util');

const TEMPSENS_TIMEOUT = 10000; 

class ZigbeeTemperatureFeature extends TemperatureFeature {

    constructor(device, feature) {
        super(device, feature);     
        this.ispolling = (feature.settings && feature.settings.ispolling) ? feature.settings.ispolling : false;
        this.long_poll_interval = (feature.settings && feature.settings.long_poll_interval) ? feature.settings.long_poll_interval : -1;
        this.polling_timer = 0;

        logger.debug("Initialized a Zigbee temperature sensor feature for device id: " + this.deviceid + " ispolling: " + this.ispolling + " long_poll_interval: " + this.long_poll_interval);        
    }

    on_datareceive_event(properties) {
        super.on_datareceive_event(properties);
    }

    on_activated(payload) {
        try {
            super.on_activated(payload);
            this.read_temperature();
        }
        catch (err) {
            logger.error("TemperatureFeature on_activated error %j", err);
        }
    }

    on_device_contacting(payload) {
        console.log("on_device_contacting() try reading temperature");
        // get the polling 
        this.read_temperature();
    }

    start_polling() {
        if (!this.ispolling || this.this.long_poll_interval <= 0) {
            return;
        }

        if (this.polling_timer) {
            clearInterval(this.polling_timer);
        }

        this.polling_timer = setInterval(
            () => {

            },
            this.long_poll_interval
        );
    }

    read_temperature(callback) {
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.readTemperature(device_details, TEMPSENS_TIMEOUT);
        transport.send(cmd, (err, value) => {
            if (err) {
                // in case of timed out send back the previously read value
                if (callback && this.temperature != 0 && err == constants.IOT_ERROR_TIMEDOUT) {
                    console.log("send existing value on timeout");
                    var result = {
                        payload: {
                            temperature: this.temperature
                        }
                    };
                    callback(null, result);
                }

                return logger.error("temperature read error %j", err);
            }

            this.temperature = value;

            if (callback) {
                var result = {
                    payload: {
                        temperature: value
                    }
                };
                callback(null, result);
            }

            var msg = util.format("temperature: %f Celsius", value);
            logger.debug(msg);

            //
        });
    }

    read(callback) {
        try {
            this.read_temperature(callback);
        }
        catch (err) {
            callback(err);
        }
    }

}

module.exports = ZigbeeTemperatureFeature;