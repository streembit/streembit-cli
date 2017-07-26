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
const util = require('util');

class TemperatureHumidityDevice extends Device {

    constructor(id, device, cmdbuilder, transport) {
        super(id, device, cmdbuilder, transport);      

        this.temperature = 0;

        logger.debug("initializing a temperature & humidity sensor device id: " + id);
    }

    on_active_device() {
        super.on_active_device();

        // get the temperature
        this.get_temperature();
    }

    read_temperature(timer, cmd) {
        this.transport.send(cmd, (err, value) => {
            if (err) {
                return logger.error("temperature read error %j", err);
            }

            this.temperature = value;

            var msg = util.format("temperature: %f Celsius", value);
            logger.debug(msg);

            if (timer) {
                clearInterval(timer);
            }
            //
        });
    }

    get_temperature() {
        var timer = 0;
        var cmd = this.command_builder.readTemperature(this.id, this.details.address16, 10000);

        timer = setInterval(
            () => {
                console.log("try to read temperature again")
                this.read_temperature(timer, cmd);
            },
            12000
        );

        // read first
        this.read_temperature(timer, cmd);
    }

}

module.exports = TemperatureHumidityDevice;