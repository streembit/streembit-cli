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




import { definitions as iotdefinitions } from '../../../definitions.js';
import { SwitchFeature } from "../switch.js";
const logger = require("streembit-util").logger;

import { ZigbeeCommands as zigbeecmd } from '../../../protocols/zigbee/commands/index.js';

const events = require("streembit-util").events;

let CLUSTERID = 0x0006;

class ZigbeeSwitchFeature extends SwitchFeature {

    constructor(deviceid, feature, feature_type, transport) {
        super(deviceid, feature, feature_type, transport);

        this.cluster = feature.toLowerCase();
        let clusternum = parseInt(this.cluster, 16);
        if (clusternum != CLUSTERID) {
            throw new Error("ZigbeeSwitchFeature " + feature + " is invalid cluster");
        }

        this.cluster_endpoint = -1;
        this.IEEEaddress = 0;
        this.NWKaddress = 0;
        this.property_names.push(iotdefinitions.PROPERTY_SWITCH_STATUS);
        logger.debug("Initialized a Zigbee switch measurement");
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_SWITCH_STATUS) {
                        try {
                            this.switchstatus = item.value;
                            logger.debug("ZigbeeSwitchFeature switch status: " + item.value);
                            let data = {
                                payload: {
                                    event: iotdefinitions.EVENT_PROPERTY_REPORT,
                                    switch_status: item.value
                                }
                            };
                            super.on_datareceive_event(data, iotdefinitions.EVENT_NOTIFY_USERS);

                            // call the associated propread
                            events.emit("feature_property_read_request");
                        }
                        catch (e) {
                            logger.error(`ZigbeeSwitchFeature handle PROPERTY_SWITCH_STATUS error: ${e.message}`);
                        }
                    }
                }
            );
        }
        catch (err) {
            logger.error("ZigbeeSwitchFeature on_datareceive_event() error: %j", err);
        }
    }

    iscluster(param) {
        return this.cluster == param;
    }

    on_device_announce(properties) {
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        logger.debug("ZigbeeSwitchFeature on_device_announce() IEEEaddress: " + this.IEEEaddress + " NWKaddress: " + this.NWKaddress);

        if (!this.isbindcomplete) {
            this.bind();
        }
        else {
            if (!this.isreportcomplete) {
                // bind was completed, send the report configure request
                this.configure_report();
            }
            else {
                logger.info("ZigbeeTemperatureFeature on_device_announce() do nothing as the feature was binded and report was configured");
            }
        }
    }

    bind() {
        var txn = 0x50;
        logger.debug("ZigbeeSwitchFeature cluster 0006, send bind request at endpoint: " + this.cluster_endpoint);
        var cmd = zigbeecmd.bind(txn, this.IEEEaddress, this.NWKaddress, CLUSTERID, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    on_clusterlist_receive(endpoint) {
        try {
            logger.debug("ZigbeeSwitchFeature " + this.IEEEaddress + " on_clusterlist_receive()");
            this.cluster_endpoint = endpoint;
            this.bind();
        }
        catch (err) {
            logger.error("ZigbeeSwitchFeature on_clusterlist_receive() error: %j", err);
        }
    }

    configure_report() {
        logger.debug("ZigbeeSwitchFeature send configure report");
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

        var cmd = zigbeecmd.configureReport(this.IEEEaddress, this.NWKaddress, CLUSTERID, reports, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    on_bind_complete(payload) {
        try {
            super.on_bind_complete();
            logger.debug("ZigbeeSwitchFeature " + this.IEEEaddress + " 0006 on_bind_complete()");
            this.configure_report();
        }
        catch (err) {
            logger.error("ZigbeeSwitchFeature on_bind_complete() error: %j", err);
        }
    }

    on_device_contacting(payload) {
    }

    on_report_configured() {
        super.on_report_configured();
        logger.debug("ZigbeeSwitchFeature " + this.IEEEaddress + " on_report_configured()");
    }

    on_device_online(properties) {
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        if (this.IEEEaddress && this.NWKaddress) {
            super.on_device_online();
        }
    }

    toggle(payload, callback) {
        this.exec_toggle_switch();

        setTimeout(
            () => {
                this.read(payload, callback);
                // call the associated propread
                events.emit("feature_property_read_request");
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