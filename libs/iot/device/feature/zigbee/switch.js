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

class ZigbeeSwitchFeature extends SwitchFeature {

    constructor(device, feature) {
        super(device, feature);  
        this.clusters = [];
        try {
            let clusterobj = JSON.parse(feature.clusters);
            if (clusterobj) {
                this.clusters = clusterobj;
            }
        }
        catch (err) { }

        this.property_names.push(iotdefinitions.PROPERTY_SWITCH_STATUS);

        logger.debug("Initialized a Zigbee switch measurement for deviceid: " + this.deviceid );        
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
                                switch_status: item.value
                            }
                        };
                        super.on_datareceive_event(data, iotdefinitions.EVENT_PROPERTY_REPORT);
                    }
                }
            );
        }
        catch (err) {
            logger.error("SwitchFeature on_datareceive_event() error: %j", err);
        }
    }

    iscluster(cluster) {
        var exists = this.clusters.indexOf(cluster);
        return (exists > -1 ) ? true : false;
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
            var transport = this.device.transport;
            var commandbuilder = this.device.command_builder;
            var device_details = this.device.details;
            var cmd = commandbuilder.configureReport(device_details, cluster, reports);
            transport.send(cmd);            
        }
        catch (err) {
            logger.error("SwitchFeature on_bind_complete() error: %j", err);
        }
    }

    on_device_contacting(payload) {
        this.get_switchstatus(payload);
    }

    on_activated(payload) {        
    }

    on_clusterlist_receive() {
        try {
            if (!this.device.details || !this.device.details.clusters || !Array.isArray(this.device.details.clusters) || !this.device.details.clusters.length) {
                return logger.error("Zigbee cluster list is empty");
            }

            var exists = false;
            this.device.details.clusters.forEach(
                (item) => {
                    if (item == "0006") {
                        exists = true;
                    }
                }
            );

            if (exists) {
                logger.debug("SwitchFeature cluster 0006 exists");

                // bind
                var transport = this.device.transport;
                var commandbuilder = this.device.command_builder;
                var device_details = this.device.details;
                var clusterid = 0x0006;
                var cmd = commandbuilder.bind(0x50, device_details, clusterid);
                transport.send(cmd);
            }
        }
        catch (err) {
            logger.error("SwitchFeature on_clusterlist_receive() error: %j", err);
        }
    }

    on_report_configured() {
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
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.execToggleSwitch(device_details);
        transport.send(cmd);
    }

    get_switchstatus() {
        try {
            var transport = this.device.transport;
            var commandbuilder = this.device.command_builder;
            var device_details = this.device.details;
            var cmd = commandbuilder.readSwitchStatus(device_details);
            transport.send(cmd);
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
            callback(err);
        }
    }

    configure() {
    }
}

module.exports = ZigbeeSwitchFeature;