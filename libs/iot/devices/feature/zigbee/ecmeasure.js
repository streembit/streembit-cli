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
const EcMeasureFeature = require("../ecmeasure");
const events = require("libs/events");
const logger = require("libs/logger");
const async = require("async");
const util = require('util');

class ZigbeeEcMeasureFeature extends EcMeasureFeature {

    constructor(device, feature) {
        super(device, feature);  
        this.power_divisor = (feature.settings && feature.settings.acformatting && feature.settings.acformatting.divisor) ? feature.settings.acformatting.divisor : 0;
        this.power_multiplier = (feature.settings && feature.settings.acformatting && feature.settings.acformatting.multiplier) ? feature.settings.acformatting.multiplier : 1;        

        logger.debug("Initialized a Zigbee EC measuremenent feature for device id: " + this.deviceid + ", power_multiplier: " + this.power_multiplier + " power_divisor: " + this.power_divisor);        
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_ACTIVEPOWER) {
                        var value = item.value;
                        if (this.power_divisor > 0) {
                            value = value / this.power_divisor;
                        }
                        if (this.power_multiplier) {
                            value = value * this.power_multiplier;
                        }
                        this.power_consumption = value;
                        logger.debug("power_consumption: %d Watt", this.power_consumption);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_VOLTAGE) {
                        this.voltage = item.value;
                        logger.debug("voltage: %d Volt", this.voltage)
                    }
                }
            );
        }
        catch (err) {
            logger.error("EcMeasureFeature on_datareceive_event() error: %j", err);
        }
    }    

    on_device_contacting(payload) {
        super.on_device_contacting(payload);
    }

    on_activated(payload) {
        try {

            // get the power consumption
            setTimeout(() => { this.get_powerdivisor() }, 1000);

            // get the power consumption
            setTimeout(() => { this.get_powermultiplier() }, 2000);

            setTimeout(
                () => {
                    this.read_power((err, result) => {
                    });
                },
                3000
            );
            
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
        this.voltage = 0;
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.readVoltage(device_details, 5000);
        transport.send(cmd);
        if (callback) {
            setTimeout(() => { callback(); }, 1000);
        }
    }

    get_powerconsumption(callback) {
        this.power_consumption = 0;
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.readPower(device_details, 5000);
        transport.send(cmd);    
        if (callback) {
            setTimeout(() => { callback(); }, 1000);
        }
    }

    get_powermultiplier() {
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.readPowerMultiplier(device_details, 5000);
        transport.send(cmd);
    }

    get_powerdivisor() {
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.readPowerDivisor(device_details, 5000);
        transport.send(cmd);
    }

}

module.exports = ZigbeeEcMeasureFeature;