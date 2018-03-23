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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const UNDEFINED = 0;
const NOTHANDLED = -1;

var definitions = {

    ZIGBEE: "zigbee",
    ZWAVE: "zwave",

    IOT_DEVICE_GATEWAY: 1,
    IOT_DEVICE_ENDDEVICE: 2,

    IOT_STATUS_UNKOWN: -1,
    IOT_ERROR_TIMEDOUT: -2,
    IOT_ERROR_NODATA: -3,
    IOT_ERROR_DEVICE_OFFLINE: -4,

    IOTCMD_DEVICE_DETAILS: 0x00,
    IOTCMD_READVALUES: 0x01,
    IOTCMD_TOGGLE: 0x02,
    IOTCMD_TURNOFF: 0x03,
    IOTCMD_TURNON: 0x04,
    IOTCMD_ENABLEDEVICEJOIN: 0x20,

    IOTCMD_USER_ADD: 0x06,
    IOTCMD_USER_UPDATE: 0x07,
    IOTCMD_USER_DELETE: 0x08,

    IOT_NETWORK_ZIGBEE: 1,
    IOT_NETWORK_ZWAVE: 2,
    IOT_NETWORK_SLOWPAN: 3,

    PERMISSION_NOT_COMISSIONED: 0,
    PERMISSION_ALLOWED: 1,
    PERMISSION_DENIED: 2,

    EVENT_RADIO_ERROR: 0x9000,
    IOT_DATA_RECEIVED_EVENT: 0x1000,    
    EVENT_DEVICE_ANNOUNCE: 0x2000,
    EVENT_DEVICE_INFO: 0x2001,
    EVENT_DEVICE_CONTACTING: 0x2002,
    EVENT_DEVICE_BINDSUCCESS: 0x2003,
    EVENT_DEVICE_ONLINE: 0x2004,
    EVENT_DEVICE_ENDPOINTSRCV: 0x2005,
    EVENT_DEVICE_CLUSTERSRCV: 0x2006,
    EVENT_DEVICE_PROPERTY_UPDATE: 0x2007,
    EVENT_FEATURE_PROPERTY_UPDATE: 0x2008,
    EVENT_PROPERTY_REPORT: 0x2009,
    EVENT_ENDDEVICE_JOINED: 0x200a, 
    EVENT_DEVICES_LIST: 0x200b,
    EVENT_NOTIFY_USERS: 0x200c,
    EVENT_GATEWAY_UPDATED: 0x200d,
    EVENT_GATEWAY_DATA_REQUEST: 0x200c,
    EVENT_REPORT_CONFIGURED: 0x200b,

    IOT_REQUEST_DEVICES_LIST: 0x01,
    IOT_DEVICES_LIST_RESPONSE: 0x02,
    IOT_DEVICES_LIST_CONFIGURE: 0x03,
    IOT_ALLDEVICES_LIST_REQUEST: 0x04,
    IOT_ALLDEVICES_LIST_RESPONSE: 0x05,
    IOT_SET_DEVICE_PERMISSION_REQUEST: 0x06,
    IOT_SET_DEVICE_PERMISSION_RESPONSE: 0x07,
    IOT_ENABLE_JOIN_REQUEST: 0x08,
    IOT_ENABLE_JOIN_RESPONSE: 0x09,
    IOT_DELETE_DEVICE_REQUEST: 0x0a,
    IOT_NEW_DEVICE_JOINED: 0x0b,
    IOT_REQUEST_USER_LIST: 0x0e,

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

    IOT_FUNCTION_SWITCH: 2,
    IOT_FUNCTION_ELECTRICITY_MEASUREMENT: 3,
    IOT_FUNCTION_TEMPERATURE_SENSING: 4,
    IOT_FUNCTION_RELHUMIDITY_SENSING: 5,
    IOT_FUNCTION_MOTION_SENSING: 6,

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