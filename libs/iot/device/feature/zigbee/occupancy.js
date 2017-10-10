﻿/*
 
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
const OccupancyFeature = require("../occupancy");
const events = require("libs/events");
const logger = require("libs/logger");
const async = require("async");
const util = require('util');
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");

let CLUSTERID = 0x0406;

class ZigbeeOccupancyFeature extends OccupancyFeature {

    constructor(deviceid, feature, feature_type,  transport) {
        super(deviceid, feature, feature_type, transport);  

        this.cluster = feature.toLowerCase();
        let clusternum = parseInt(this.cluster, 16);
        if (clusternum != CLUSTERID) {
            throw new Error("ZigbeeOccupancyFeature " + feature + " is invalid cluster");
        }

        this.cluster_endpoint = -1;
        this.IEEEaddress = 0;
        this.NWKaddress = 0;

        this.report_max = 0x003c; // 60 seconds        
        
        this.property_names.push(iotdefinitions.PROPERTY_OCCUPANCY);

        logger.debug("Initialized a Zigbee occupancy feature");        
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_OCCUPANCY) {
                        this.occupancy = item.value;
                        logger.debug("PROPERTY_OCCUPANCY: %d", this.occupancy);                        
                    }
                }
            );

            let data = {
                payload: {
                    event: iotdefinitions.EVENT_PROPERTY_REPORT,
                    occupancy: this.occupancy
                }
            };
            super.on_datareceive_event(data, iotdefinitions.EVENT_NOTIFY_USERS);
            this.last_update_time = Date.now();
        }
        catch (err) {
            logger.error("ZigbeeOccupancyFeature on_datareceive_event() error: %j", err);
        }
    }    

    iscluster(param) {
        return this.cluster == param;
    }

    on_clusterlist_receive(endpoint) {
        this.cluster_endpoint = endpoint;
        logger.debug("ZigbeeOccupancyFeature cluster 0406 exists at endpoint " + endpoint);

        // bind
        var txn = 0x53;
        var clusterid = CLUSTERID;
        var cmd = zigbeecmd.bind(txn, this.IEEEaddress, this.NWKaddress, clusterid, this.cluster_endpoint);
        this.transport.send(cmd);        
    }

    on_bind_complete() {
        try {
            console.log("ZigbeeOccupancyFeature on_bind_complete()");

            var cluster = 0x0406;
            var reports = [];
            // power
            var attribute = 0x0000, datatype = 0x18, mininterval = 0x01, maxinterval = 0x003c;
            reports.push(
                {
                    attribute: attribute,
                    datatype: datatype,
                    mininterval: mininterval,
                    maxinterval: this.report_max
                }
            );

            var cmd = zigbeecmd.configureReport(this.IEEEaddress, this.NWKaddress, cluster, reports, this.cluster_endpoint);
            this.transport.send(cmd);
        }
        catch (err) {
            logger.error("ZigbeeOccupancyFeature on_bind_complete() error: %j", err);
        }
    }

    on_device_contacting(payload) {
        super.on_device_contacting(payload);
    }

    on_device_contacting(payload) {
        // must send the report
    }

    on_device_online(properties) {
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        if (this.IEEEaddress && this.NWKaddress) {
            super.on_device_online();
        }
    }

    read_occupancy(callback) {
        var attributes = [0x00, 0x00];
        var cmd = zigbeecmd.readAttributes(this.IEEEaddress, this.NWKaddress, 0x0406, attributes, this.cluster_endpoint);
        this.transport.send(cmd);
    }


    read(payload, callback) {
        let current_time = Date.now();
        let last_update_elapsed = current_time - this.last_update_time;
        let is_report_available = last_update_elapsed < this.report_max * 1000
        console.log("ZigbeeOccupancyFeature last_update_elapsed: " + last_update_elapsed + " is_report_available: " + is_report_available);
        if (is_report_available) {
            var data = {
                payload: {
                    occupancy: this.occupancy
                }
            };
            callback(null, data);
        }
        else {
            super.read(payload, callback, (this.report_max * 1000 - 1));
            // do the reading
            this.read_occupancy();
        }
    }   

    configure() {
    }

    //
}

module.exports = ZigbeeOccupancyFeature;