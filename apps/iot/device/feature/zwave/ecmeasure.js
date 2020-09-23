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
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const constants = require("libs/constants");
const iotdefinitions = require("apps/iot/definitions");
const EcMeasureFeature = require("../ecmeasure");
const logger = require("streembit-util").logger;


class ZwaveEcMeasureFeature extends EcMeasureFeature {

    constructor(device, feature) {
        super(device, feature);  
        logger.debug("initialized a ZwaveEcMeasureFeature for device id: " + this.deviceid + ", power_multiplier: " + this.power_multiplier + " power_divisor: " + this.power_divisor);
    }

    on_datareceive_event(properties) {
        super.on_datareceive_event(properties);
    }

    on_device_contacting(payload) {
    }

    on_device_online(payload) {
    }

    read_power(completefn) {
    }

    read(callback) {
    }

    get_voltage(callback) {
    }

    get_powerconsumption(callback) {
    }

    // start managing features
    // called once the permission is PERMISSION_ALLOWED and the comm is established
    process_features() {       
    }

}

module.exports = ZwaveEcMeasureFeature;