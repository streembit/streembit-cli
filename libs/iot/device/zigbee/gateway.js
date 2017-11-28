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
const Devices = require("libs/devices");
const Device = require("libs/iot/device/device");
const events = require("streembit-util").events;
const logger = require("streembit-util").logger;
const iotdefinitions = require("libs/iot/definitions");
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");
const ZigbeeDevice = require('libs/iot/device/zigbee/device');

const DEFAULT_JOIN_TIME = 180; // permit joining interval in seconds

let m_address64;
let m_address16;
let m_endpoint;

class ZigbeeGateway extends Device {

    constructor(id, device, cmdbuilder, transport) {
        try {
            super(id, device, cmdbuilder, transport);
            m_endpoint = (this.details && this.details.endpoint) ? this.details.endpoint : 0;
            this.permission = iotdefinitions.PERMISSION_ALLOWED;
            this.active = false;

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
            if (payload.type == iotdefinitions.EVENT_DEVICE_ONLINE && !this.active) {
                this.active = true;
                m_address64 = payload.address64;
                m_address16 = payload.address16;
                logger.debug("ZigbeeGatewayDevice address64: " + m_address64 + ", address16: " + m_address16);

                // update other devices
                events.emit(
                    iotdefinitions.IOT_DATA_RECEIVED_EVENT,
                    {
                        "type": iotdefinitions.EVENT_GATEWAY_UPDATED,
                        "address64": m_address64,
                        "address16": m_address16,
                        "endpoint": m_endpoint
                    }
                );  

                // enable join 
                this.enable_join();
            }
           
        }
        catch (err) {
            logger.error("ZigbeeGateway on_data_received() error: %j", err);
        }
    }

    enable_join(interval) {
        var time = interval || DEFAULT_JOIN_TIME;
        logger.debug("Gateway " + this.id + " enable join for " + time + " seconds.")
        var cmd = zigbeecmd.permitJoinRequest(m_address64, m_address16, time);
        this.transport.send(cmd);
    }

    get_device_info() {
        var info = this.details;
        info["address64"] = m_address64;
        info["address16"] = m_address16;
        info["deviceid"] = this.id;
        info["type"] = this.type;
        return info;
    }

    send_gateway_details(callback) {
        let response = {
            id: this.id,
            address64: m_address64,
            address16: m_address16
        };
        callback(response);
    }

}

module.exports = ZigbeeGateway;