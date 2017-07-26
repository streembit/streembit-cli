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
const Device = require("./device");
const events = require("libs/events");
const logger = require("libs/logger");

class SmartPlugDevice extends Device {

    constructor(id, device, cmdbuilder, transport) {
        super(id, device, cmdbuilder, transport);      

        this.switch_status = constants.IOT_STATUS_UNKOWN;
        this.last_switch_time = constants.IOT_STATUS_UNKOWN;
        this.power_consumption = constants.IOT_STATUS_UNKOWN;
        this.power_divisor = (this.settings && this.settings.acformatting && this.settings.acformatting.divisor) ? this.settings.acformatting.divisor : 0;
        this.power_multiplier = (this.settings && this.settings.acformatting && this.settings.acformatting.multiplier) ? this.settings.acformatting.multiplier : 1;
        this.voltage = constants.IOT_STATUS_UNKOWN;

        logger.debug("initializing a smart plug device id: " + id);
    }

    on_active_device() {
        super.on_active_device();       

        // get the switch status
        this.get_switchstatus();
        
        // get voltage
        setTimeout(() => { this.get_voltage() }, 1000);

        // get the power consumption
        setTimeout(() => { this.get_powerdivisor() }, 2000);

        // get the power consumption
        setTimeout(() => { this.get_powermultiplier() }, 3000);

        // get the power consumption
        setTimeout(() => { this.get_powerconsumption() }, 4000);

    }

    toggle(callback) {
        this.exec_toggle_switch();
    }

    read(callback) {
        var result = {
            payload: {
                switch_status: constants.IOT_STATUS_UNKOWN,
                power_consumption: this.power_consumption,
                voltage: this.voltage
            }
        }; 

        this.get_switchstatus((err, value) => {
            if (err) {
                return callback(err);
            }

            result.payload.switch_status = value;
            callback(null, result);

            //
        });
    }

    exec_toggle_switch() {
        var cmd = this.command_builder.execToggleSwitch(this.id, this.details.address16);
        this.transport.send(cmd);
    }

    get_switchstatus(callback) {
        var cmd = this.command_builder.readSwitchStatus(this.id, this.details.address16, 3000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                if (callback) {
                    callback(err);
                }
                return logger.error("switch status read error %j", err);
            }

            this.switch_status = value;
            logger.debug("switch status: " + value);
            if (callback) {
                callback(null, value);
            }

            //
        });
    }

    get_voltage() {
        var cmd = this.command_builder.readVoltage(this.id, this.details.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("voltage read error %j", err);
            }

            this.voltage = value;
            logger.debug("switch voltage: " + value);

            //
        });
    }

    get_powerconsumption() {
        this.power_consumption = 0;
        var cmd = this.command_builder.readPower(this.id, this.details.address16, 5000);
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
            logger.debug("switch power consumption: " + this.power_consumption);

            //
        });        
    }

    get_powermultiplier() {
        var cmd = this.command_builder.readPowerMultiplier(this.id, this.details.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("power multiplier read error %j", err);
            }

            this.power_multiplier = value;
            logger.debug("switch power multiplier: " + value);

            //
        });
    }

    get_powerdivisor() {
        var cmd = this.command_builder.readPowerDivisor(this.id, this.details.address16, 5000);
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("power divisor read error %j", err);
            }

            this.power_divisor = value;
            logger.debug("switch power divisor: " + value);

            //
        });
    }
}

module.exports = SmartPlugDevice;