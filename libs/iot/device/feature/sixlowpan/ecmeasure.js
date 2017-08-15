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

class SixLowPANEcMeasureFeature extends EcMeasureFeature {

    constructor(device, feature) {
        super(device, feature);  
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

}

module.exports = SixLowPANEcMeasureFeature;