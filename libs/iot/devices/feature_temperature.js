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
const util = require('util');

const TEMPSENS_TIMEOUT = 10000; 

class TemperatureFeature extends IoTFeature {

    constructor(id, device, cmdbuilder, transport) {
        super(id, device, cmdbuilder, transport);      

        this.temperature = 0;

        logger.debug("initialized a temperature sensor feature for device id: " + id);
    }

    on_activated() {
        try {
            super.on_activated();

            // get the temperature
            this.read_temperature();
        }
        catch (err) {
            logger.error("TemperatureFeature on_activated error %j", err);
        }
    }


    read_temperature(callback) {
        //debugger;
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