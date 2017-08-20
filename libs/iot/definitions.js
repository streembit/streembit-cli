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

const UNDEFINED = 0;
const NOTHANDLED = -1;

var definitions = {

    ZIGBEE: "zigbee",
    ZWAVE: "zwave",

    IOT_NETWORK_ZIGBEE: 1,
    IOT_NETWORK_ZWAVE: 2,
    IOT_NETWORK_SLOWPAN: 3,

    PERMISSION_NOT_COMISSIONED: 0,
    PERMISSION_ALLOWED: 1,
    PERMISSION_DENIED: 2,

    IOT_DATA_RECEIVED_EVENT: "iot_data_received",
    EVENT_RADIO_ERROR: "radio_error",
    EVENT_DEVICE_ANNOUNCE: "device_announce",
    EVENT_DEVICE_INFO: "device_info",
    EVENT_DEVICE_CONTACTING: "device_contacting",
    EVENT_DEVICE_BINDSUCCESS: "binding_success",
    EVENT_DEVICE_ONLINE: "device_online",
    EVENT_DEVICE_ENDPOINTSRCV: "device_endpoints_rcv",
    EVENT_DEVICE_CLUSTERSRCV: "device_clusters_rcv",
    EVENT_DEVICE_PROPERTY_UPDATE: "device_property_update",
    EVENT_FEATURE_PROPERTY_UPDATE: "iot_property_update",
    EVENT_PROPERTY_REPORT: "iot_property_report",
    EVENT_ENDDEVICE_JOINED: "iot_enddevice_joined", 
    EVENT_DEVICES_LIST: "iot_devices_list",
    EVENT_NOTIFY_USERS: "iot_notify_users",
    EVENT_GATEWAY_UPDATED: "iot_gateway_updated",

    IOT_REQUEST_DEVICES_LIST: 0x01,
    IOT_DEVICES_LIST_RESPONSE: 0x02,
    IOT_DEVICES_LIST_CONFIGURE: 0x03,

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
    PROPERTY_VOLTAGEMULTIPLIER: "voltage_multiplier",
    PROPERTY_VOLTAGEDIVISOR: "voltage_divisor",
    PROPERTY_OCCUPANCY: "occupancy",

    MIN_REPORTING_INTERVAL: 60000,
    MAX_REPORTING_INTERVAL: (60000 * 60),

    ZIGBEE_CLUSTERMAP: {
        "0000": 1,
        "0006": 2,
        "0b04": 3,
        "0402": 4,
        "0405": 5,
        "0406": 6,
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
    },

    ZIGBEE_TYPEMAP: {
        1: "0000",
        2: "0006",
        3: "0b04",
        4: "0402",
        5: "0405",
        6: "0406",
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
    },

    FEATURETYPEMAP: {
        1: NOTHANDLED,
        2: "switch",
        3: "ecmeasure",
        4: "temperature",
        5: "motion",
        6: "occupancy",
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