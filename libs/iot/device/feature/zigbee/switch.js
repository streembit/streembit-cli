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
const SwitchFeature = require("../switch");
const events = require("libs/events");
const logger = require("libs/logger");
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");

class ZigbeeSwitchFeature extends SwitchFeature {

    constructor(deviceid, feature, transport) {
        super(deviceid, feature, transport);  
        this.cluster = feature.cluster;
        this.cluster_endpoint = -1;
        this.IEEEaddress = 0;
        this.NWKaddress = 0;
        this.property_names.push(iotdefinitions.PROPERTY_SWITCH_STATUS);
        logger.debug("Initialized a Zigbee switch measurement" );        
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_SWITCH_STATUS) {
                        this.switchstatus = item.value;
                        logger.debug("ZigbeeSwitchFeature switch status: " + item.value);
                        let data = {
                            payload: {
                                event: iotdefinitions.EVENT_PROPERTY_REPORT,
                                switch_status: item.value
                            }
                        };
                        super.on_datareceive_event(data, iotdefinitions.EVENT_NOTIFY_USERS);
                    }
                }
            );
        }
        catch (err) {
            logger.error("SwitchFeature on_datareceive_event() error: %j", err);
        }
    }

    iscluster(cluster) {
        return this.cluster == cluster;
    }

    on_bind_complete(payload) {
        try {
            var cluster = 0x0006;
            var attribute = 0x0000, datatype = 0x10, mininterval = 0x02, maxinterval = 0x0040;
            var reports = [];
            reports.push(
                {
                    attribute: attribute,
                    datatype: datatype,
                    mininterval: mininterval,
                    maxinterval: maxinterval
                }
            );

            var cmd = zigbeecmd.configureReport(this.IEEEaddress, this.NWKaddres, cluster, reports, this.cluster_endpoint);
            this.transport.send(cmd);            
        }
        catch (err) {
            logger.error("SwitchFeature on_bind_complete() error: %j", err);
        }
    }

    on_device_contacting(payload) {
    }

    on_device_online(properties) {   
        if (properties && Array.isArray(properties) && properties.length) {
            properties.forEach(
                (item) => {
                    if (item.hasOwnProperty("name") && item.hasOwnProperty("value")) {
                        if (item.name == "address64") {
                            this.IEEEaddress = item.value;
                        }
                        else if (item.name == "address16") {
                            this.NWKaddress = item.value;
                        }
                    }
                }
            );
        }

        if (this.IEEEaddress && this.NWKaddress) {
            super.on_device_online();
        }
    }

    on_clusterlist_receive(descriptor) {
        try {
            if (!descriptor || !descriptor.hasOwnProperty("endpoint") || !descriptor.hasOwnProperty("clusters") || !Array.isArray(descriptor.clusters) || !descriptor.clusters.length) {
                return logger.error("Zigbee cluster descriptor is empty");
            }

            var exists = false;
            descriptor.clusters.forEach(
                (cluster) => {
                    if (cluster == "0006") {
                        this.cluster_endpoint = descriptor.endpoint;
                        exists = true;
                    }
                }
            );

            if (exists) {
                logger.debug("SwitchFeature cluster 0006 exists");

                // bind
                var txn = 0x50;
                var clusterid = 0x0006;
                var cmd = zigbeecmd.bind(txn, this.IEEEaddress, this.NWKaddres, clusterid, this.cluster_endpoint);
                this.transport.send(cmd);
            }
        }
        catch (err) {
            logger.error("SwitchFeature on_clusterlist_receive() error: %j", err);
        }
    }

    toggle(payload, callback) {
        this.exec_toggle_switch();

        setTimeout(
            () => {
                this.read(callback);
            },
            500
        );
    }    

    exec_toggle_switch() {
        var cmd = zigbeecmd.execToggleSwitch(this.IEEEaddress, this.NWKaddress, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    get_switchstatus() {
        try {
            var cmd = zigbeecmd.readSwitchStatus(this.IEEEaddress, this.NWKaddress, this.cluster_endpoint);
            this.transport.send(cmd);
        }
        catch (err) {
            logger.error("get_switchstatus() error %j", err);
        }
    }

    read(payload, callback) {
        try {
            super.read(payload, callback, 6000);
            // do the reading
            this.get_switchstatus();
            //
        }
        catch (err) {
            callback(err.message);
        }
    }

    configure() {
    }
}

module.exports = ZigbeeSwitchFeature;