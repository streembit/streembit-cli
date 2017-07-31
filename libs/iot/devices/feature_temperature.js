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
const util = require('util');

const TEMPSENS_TIMEOUT = 10000; 

class TemperatureFeature extends IoTFeature {

    constructor(device, feature) {
        super(device, feature); 
        this.temperature = 0;       
        this.ispolling = (feature.settings && feature.settings.ispolling) ? feature.settings.ispolling : false;
        this.long_poll_interval = (feature.settings && feature.settings.long_poll_interval) ? feature.settings.long_poll_interval : -1;
        this.polling_timer = 0;
        logger.debug("initialized a temperature sensor feature for device id: " + this.deviceid + " ispolling: " + this.ispolling + " long_poll_interval: " + this.long_poll_interval);
        this.create_event_handlers();
    }

    on_datareceive_event(payload) {
        if (!Array.isArray(properties) || !properties.length) {
            return;
        }

        properties.forEach(
            (item) => {
                if (item.property == iotdefinitions.PROPERTY_TEMPERATURE) {
                    this.temperature = item.value;
                }
            }
        );            
    }

    create_event_handlers() {
        super.create_event_handlers();
    }

    //create_event_handlers() {
    //    //debugger;
    //    var device_datareceived_event = this.deviceid + iotdefinitions.DATA_RECEIVED_EVENT;
    //    events.on(
    //        device_datareceived_event,
    //        (payload) => {
    //            //debugger;
    //            if (payload.type == iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE) {
    //                if (payload.properties && payload.properties.length) {
    //                    payload.properties.forEach(
    //                        (item) => {
    //                            if (item.property == iotdefinitions.PROPERTY_TEMPERATURE) {
    //                                this.temperature = item.value;
    //                            }
    //                        }
    //                    );
    //                }
    //            }
    //        }
    //    );
    //    console.log("TemperatureFeature listening on event: " + device_datareceived_event);
    //}

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
        var cmd = this.command_builder.readTemperature(this.address64, this.address16, TEMPSENS_TIMEOUT);
        this.transport.send(cmd, (err, value) => {
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

    configure_report() {
        // data: [0x00, txn, 0x06, 0x00, 0x00, 0x00, 0x29, 0x40, 0x00, 0x80, 0x00]
        var attr1 = 0x00;
        var attr2 = 0x00;
        var datatype = 0x29;
        var mintime1 = 0x40; // min timeout is 0x0040, but it must be in Little Endian order
        var mintime2 = 0x00;
        var maxtime1 = 0x80; // max timeout is 0x0080, but it must be in Little Endian order
        var maxtime2 = 0x00;
        var cmd = this.command_builder.configureReport(this.address64, this.address16, attr1, attr2, datatype, mintime1, mintime2, maxtime1, maxtime2, 10000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("temperature configure report error %j", err);
            }
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

module.exports = TemperatureFeature;