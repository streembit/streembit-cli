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
const async = require("async");
const util = require('util');

class EcMeasureFeature extends IoTFeature {

    constructor(device, feature) {
        super(device, feature);  
        this.voltage = constants.IOT_STATUS_UNKOWN;
        this.power_consumption = constants.IOT_STATUS_UNKOWN;
        this.power_divisor = (feature.settings && feature.settings.acformatting && feature.settings.acformatting.divisor) ? feature.settings.acformatting.divisor : 0;
        this.power_multiplier = (feature.settings && feature.settings.acformatting && feature.settings.acformatting.multiplier) ? feature.settings.acformatting.multiplier : 1;        
        logger.debug("initialized a EC measuremenent feature for device id: " + this.deviceid + ", power_multiplier: " + this.power_multiplier + " power_divisor: " + this.power_divisor);
        this.create_event_handlers();
    }

    on_datareceive_event(payload) {
    }

    create_event_handlers() {
        super.create_event_handlers();
    }

    on_device_contacting(payload) {
    }

    on_activated(payload) {
        try {
            //debugger;
            super.on_activated(payload);

            // get voltage
            //setTimeout(() => { this.get_voltage() }, 1000);

            /*
            // get the power consumption
            setTimeout(() => { this.get_powerdivisor() }, 1000);

            // get the power consumption
            setTimeout(() => { this.get_powermultiplier() }, 2000);

            // get the power consumption
            //setTimeout(() => { this.get_powerconsumption() }, 2000);

            setTimeout(
                () => {
                    this.read_power((err, result) => {
                    });
                },
                3000
            );
            */
        }
        catch (err) {
            logger.error("EcMeasureFeature on_activated error %j", err);
        }
    }

    read_power(completefn) {
        async.waterfall(
            [
                (callback) => {
                    this.get_voltage(callback)
                },
                (callback) => {
                    this.get_powerconsumption(callback);
                }                
            ],
            (err) => {
                if (err) {
                    completefn(err);
                    logger.error("read power error: %j", err);
                }
                else {
                    var result = {
                        payload: {
                            power_consumption: this.power_consumption,
                            voltage: this.voltage
                        }
                    };
                    completefn(null, result);
                }                
            }
        );
    }

    read(callback) {
        try {
            this.read_power(callback);
        }
        catch (err) {
            callback(err);
        }
    }

    get_voltage(callback) {

        var cmd = this.command_builder.readVoltage(this.address64, this.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("voltage read error %j", err);
            }

            this.voltage = value;
            logger.debug("voltage: " + value);
            if (callback) {
                callback()
            }

            //
        });
    }

    get_powerconsumption(callback) {
        this.power_consumption = 0;
        var cmd = this.command_builder.readPower(this.address64, this.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("power read error %j", err);
            }

            if (value > 0) {
                if (this.power_divisor > 0) {
                    value = value / this.power_divisor;
                }

                if (this.power_multiplier) {
                    value = value * this.power_multiplier;
                }
            }

            this.power_consumption = value;
            logger.debug("power consumption: " + this.power_consumption);
            if (callback) {
                callback()
            }

            //
        });        
    }

    get_powermultiplier() {
        var cmd = this.command_builder.readPowerMultiplier(this.address64, this.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("power multiplier read error %j", err);
            }

            this.power_multiplier = value;
            logger.debug("power multiplier: " + value);

            //
        });
    }

    get_powerdivisor() {
        var cmd = this.command_builder.readPowerDivisor(this.address64, this.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("power divisor read error %j", err);
            }

            this.power_divisor = value;
            logger.debug("power divisor: " + value);

            //
        });
    }
}

module.exports = EcMeasureFeature;