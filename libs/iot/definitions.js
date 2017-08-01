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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const UNDEFINED = "undefined";

var definitions = {
    ZIGBEE: "zigbee",

    DATA_RECEIVED_EVENT: "_data_received",
    EVENT_RADIO_ERROR: "radio_error",
    EVENT_DEVICE_CONTACTING: "device_contacting",
    EVENT_DEVICE_ACTIVATED: "device_activated",
    EVENT_DEVICE_PROPERTY_UPDATE: "device_property_update",
    EVENT_FEATURE_PROPERTY_UPDATE: "property_update",

    PROPERTY_HWVERSION: "hwversion",
    PROPERTY_MANUFACTURERNAME: "manufacturername",
    PROPERTY_MODELIDENTIFIER: "modelidentifier",
    PROPERTY_SWITCH_STATUS: "switchstatus",
    PROPERTY_ACTIVEPOWER: "activepower",
    PROPERTY_VOLTAGE: "voltage",
    PROPERTY_TEMPERATURE: "temperature",
    PROPERTY_RELATIVE_HUMIDITY: "relative_humidity",
    PROPERTY_POWERDIVISOR: "power_divisor",
    PROPERTY_POWERMULTIPLIER: "power_multiplier",

    FEATURETYPEMAP: {
        2: "switch",
        3: "ecmeasure",
        4: "temperature",
        5: "motion",
        6: UNDEFINED,
        7: UNDEFINED,
        8: UNDEFINED,
        9: UNDEFINED,
        10: UNDEFINED,
        11: UNDEFINED,
        12: UNDEFINED,
        13: UNDEFINED,
        14: UNDEFINED,
        15: UNDEFINED,
        16: UNDEFINED,
        17: UNDEFINED,
        18: UNDEFINED,
        19: UNDEFINED,
        20: UNDEFINED
    }
};

module.exports = definitions;