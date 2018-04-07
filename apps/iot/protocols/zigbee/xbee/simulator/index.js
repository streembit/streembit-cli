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

const xbeeapi = require('../xbeeapi');
const util = require('util');
const SerialPort = require('serialport');
const logger = require("streembit-util").logger;
const config = require('libs/config');
const events = require("streembit-util").events;
const constants = require("libs/constants");
const iotdefinitions = require("apps/iot/definitions");
const BufferReader = require('buffer-reader');
const BitStream = require('libs/utils/bitbuffer').BitStream;
const sprintf = require('sprintf-js').sprintf;
const Devices = require("libs/devices");
const async = require("async");

const MYENDPOINT = 0x02; // TODO review this to set it dynamcally

const BIND_ID_ONOFFSWITCH = 0x50;
const BIND_ID_ELECTRICAL_MEASUREMENT = 0x51;
const BIND_ID_TEMPERATURE = 0x52;
const BIND_ID_OCCUPANCY = 0x53;

let C = xbeeapi.constants;

let xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

let serialport = 0;
//let pending_tasks = [];
let devices = {};
let neighbortable = [];

class XbeeSimulator {
    constructor() {}

    // simulate serialport.write
    // ...

    init_xbee_framehandler() {
        xbee.on("frame_object", (frame) => {
            try {
                if (frame && frame.clusterId) {
                    logger.debug(`frame type: ${frame.type} clusterid: ${frame.clusterId}`);
                    this.handle_frame(frame);
                }

                //
            }
            catch (err) {
                logger.error("on XBEE frame handler error: %j", err);
            }
        });
    }

    handle_frame(frame) {
        switch (frame.clusterId) {
            case "0000":
            case "0013":
            case "8032":
            case "8031":
            case "0006":
            case "0402":
            case "0b04":
            case "8005":
            case "8004":
            case "0020":
            case "8021":
            case "8000":
            case "0406":
            case "8036":
            case "8034":
                var clusterfn = "handle_cluster_" + frame.clusterId;
                this[clusterfn](frame);
                break;
            default:
                break;
        }
    }

}

module.exports = XbeeSimulator;

