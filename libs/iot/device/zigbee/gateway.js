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
const Devices = require("libs/devices");
const Device = require("libs/iot/device/device");
const events = require("libs/events");
const logger = require("libs/logger");
const iotdefinitions = require("libs/iot/definitions");
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");
const ZigbeeDevice = require('libs/iot/device/zigbee/device');

let m_address64;
let m_address16;
let m_endpoint;

class ZigbeeGateway extends Device {

    constructor(id, device, cmdbuilder, transport) {
        try {
            super(id, device, cmdbuilder, transport);
            m_endpoint = (this.details && this.details.endpoint) ? this.details.endpoint : 0;
            logger.debug("Initialized ZigbeeGateway device id: " + id);            
        }
        catch (err) {
            throw new Error("ZigbeeGateway constructor error: " + err.message);
        }
    }

    static get address64() {
        return m_address64;
    }

    static get address16() {
        return m_address16;
    }

    static get endpoint() {
        return m_endpoint;
    }

    on_data_received(payload) {
        try {
            if (payload.type == iotdefinitions.EVENT_DEVICE_ONLINE) {
                this.active = true;
                m_address64 = payload.address64;
                m_address16 = payload.address16;
                logger.debug("ZigbeeGatewayDevice address64: " + m_address64);
                logger.debug("ZigbeeGatewayDevice address16: " + m_address16);

                // enable join for 120 seconds
                var cmd = zigbeecmd.permitJoinRequest(m_address64, m_address16, 120);
                this.transport.send(cmd);
            }
           
        }
        catch (err) {
            logger.error("ZigbeeGateway on_data_received() error: %j", err);
        }
    }

    enable_join(payload, callback) {
    }

    get_device_info() {
        this.details["address64"] = m_address64;
        this.details["address16"] = m_address16;
        this.details["deviceid"] = this.id;
        return this.details;
    }

}

module.exports = ZigbeeGateway;