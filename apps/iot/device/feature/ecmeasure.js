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




import { definitions as iotdefinitions } from '../../definitionsjs';

import { IoTFeature } from "./feature.js";

export class EcMeasureFeature extends IoTFeature {
    constructor(deviceid, feature, feature_type, transport) {
        super(deviceid, feature, feature_type, transport);
        this.voltage = iotdefinitions.IOT_STATUS_UNKOWN;
        this.power_consumption = iotdefinitions.IOT_STATUS_UNKOWN;
    }

    on_datareceive_event(data, event) {
        super.on_datareceive_event(data, event);
    }

    on_device_contacting(payload) {
    }

    on_device_online(payload) {
        super.on_device_online(payload);
    }

    read_power(completefn) {

    }

    read(payload, callback, timeout) {
        super.read(payload, callback, timeout);
    }

    get_voltage(callback) {
    }

    get_powerconsumption(callback) {
    }

    configure() {
    }

    bind() {
    }

    configure_report() {
    }

    propread() {
    }
}

