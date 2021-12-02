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
import { EcMeasureFeature } from '../ecmeasure.js';
import { logger } from 'streembit-util';
import util from 'util';
import { ZigbeeCommands as zigbeecmd } from '../../../protocols/zigbee/commands/index.js';

let CLUSTERID = 0x0b04;

class ZigbeeEcMeasureFeature extends EcMeasureFeature {

    constructor(deviceid, feature, feature_type, transport, ieeeaddress, nwkaddress) {
        super(deviceid, feature, feature_type, transport);

        this.cluster = feature.toLowerCase();
        let clusternum = parseInt(this.cluster, 16);
        if (clusternum != CLUSTERID) {
            throw new Error("ZigbeeEcMeasureFeature " + feature + " is invalid cluster");
        }

        this.power_divisor = 0;
        this.power_multiplier = 1;
        this.voltage_divisor = 0;
        this.voltage_multiplier = 1;

        this.property_names.push(iotdefinitions.PROPERTY_ACTIVEPOWER);
        this.property_names.push(iotdefinitions.PROPERTY_VOLTAGE);
        this.property_names.push(iotdefinitions.PROPERTY_POWERMULTIPLIER);
        this.property_names.push(iotdefinitions.PROPERTY_POWERDIVISOR);
        this.property_names.push(iotdefinitions.PROPERTY_VOLTAGEMULTIPLIER);
        this.property_names.push(iotdefinitions.PROPERTY_VOLTAGEDIVISOR);

        this.cluster_endpoint = -1;
        this.IEEEaddress = ieeeaddress || 0;
        this.NWKaddress = nwkaddress || 0;

        logger.debug("Initialized a Zigbee EC measuremenent feature, power_multiplier: " + this.power_multiplier + " power_divisor: " + this.power_divisor);
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            let data = {};
            data.payload = {};

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_ACTIVEPOWER) {
                        let value = item.value;
                        if (this.power_divisor > 0) {
                            value = value / this.power_divisor;
                        }
                        if (this.power_multiplier) {
                            value = value * this.power_multiplier;
                        }
                        this.power_consumption = value;
                        data.payload.power_consumption = value;
                        logger.debug("ZigbeeEcMeasureFeature power: %d Watt", this.power_consumption);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_VOLTAGE) {
                        let value = item.value;
                        if (this.voltage_divisor > 0) {
                            value = value / this.voltage_divisor;
                        }
                        if (this.voltage_multiplier) {
                            value = value * this.voltage_multiplier;
                        }

                        this.voltage = value;
                        data.payload.voltage = value;
                        logger.debug("ZigbeeEcMeasureFeature voltage: %d Volt", this.voltage);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_POWERMULTIPLIER) {
                        this.power_multiplier = item.value;
                        logger.debug("set PROPERTY_POWERMULTIPLIER: %d", this.power_multiplier);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_POWERDIVISOR) {
                        this.power_divisor = item.value;
                        logger.debug("set PROPERTY_POWERDIVISOR: %d", this.power_divisor);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_VOLTAGEMULTIPLIER) {
                        this.voltage_multiplier = item.value;
                        logger.debug("set PROPERTY_VOLTAGEMULTIPLIER: %d", this.voltage_multiplier);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_VOLTAGEDIVISOR) {
                        this.voltage_divisor = item.value;
                        logger.debug("set PROPERTY_VOLTAGEDIVISOR: %d", this.voltage_divisor);
                    }
                }
            );

            logger.debug("ZigbeeEcMeasureFeature on_datareceive_event data: " + util.inspect(data));
            if (data.payload.hasOwnProperty("voltage") || data.payload.hasOwnProperty("power_consumption")) {
                logger.debug("send EVENT_PROPERTY_REPORT");
                data.payload.event = iotdefinitions.EVENT_PROPERTY_REPORT;
                super.on_datareceive_event(data, iotdefinitions.EVENT_NOTIFY_USERS);
            }
        }
        catch (err) {
            logger.error("ZigbeeEcMeasureFeature on_datareceive_event() error: %j", err);
        }
    }

    iscluster(param) {
        return this.cluster == param;
    }

    on_device_announce(properties) {
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        logger.debug("ZigbeeEcMeasureFeature on_device_announce() IEEEaddress: " + this.IEEEaddress + " NWKaddress: " + this.NWKaddress);

        if (!this.isbindcomplete) {
            this.bind();
        }
        else {
            if (!this.isreportcomplete) {
                // bind was completed, send the report configure request
                this.configure_report();
            }
            else {
                logger.info("ZigbeeEcMeasureFeature on_device_announce() do nothing as the feature was binded and report was configured");
            }
        }
    }

    bind() {
        var txn = 0x51;
        logger.debug("ZigbeeEcMeasureFeature cluster 0B04, send bind request at endpoint: " + this.cluster_endpoint);
        var cmd = zigbeecmd.bind(txn, this.IEEEaddress, this.NWKaddress, CLUSTERID, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    // When the endpoint and cluster are identified, this receives the endpoint from the device.
    on_clusterlist_receive(endpoint) {
        try {
            logger.debug("ZigbeeEcMeasureFeature " + this.IEEEaddress + " on_clusterlist_receive()");
            this.cluster_endpoint = endpoint;
            this.bind();
        }
        catch (err) {
            logger.error("ZigbeeEcMeasureFeature on_clusterlist_receive() error: %j", err);
        }
    }

    configure_voltage_report() {
        logger.debug("ZigbeeEcMeasureFeature send configure voltage report");
        var reports = [];
        var attribute = 0x0505, datatype = 0x21, mininterval = 0x01, maxinterval = 0x003c, reportable_change = 5;
        reports.push(
            {
                attribute: attribute,
                datatype: datatype,
                mininterval: mininterval,
                maxinterval: maxinterval,
                reportable_change: reportable_change
            }
        );

        var cmd = zigbeecmd.configureReport(this.IEEEaddress, this.NWKaddress, CLUSTERID, reports, this.cluster_endpoint);
        this.transport.send(cmd);
    }


    configure_report() {
        logger.debug("ZigbeeEcMeasureFeature send configure report");
        var reports = [];
        // power
        var attribute = 0x050b, datatype = 0x29, mininterval = 0x01, maxinterval = 0x003c, reportable_change = 2;
        reports.push(
            {
                attribute: attribute,
                datatype: datatype,
                mininterval: mininterval,
                maxinterval: maxinterval,
                reportable_change: reportable_change
            }
        );

        // voltage
        attribute = 0x0505, datatype = 0x21, mininterval = 0x01, maxinterval = 0x003c, reportable_change = 5;
        reports.push(
            {
                attribute: attribute,
                datatype: datatype,
                mininterval: mininterval,
                maxinterval: maxinterval,
                reportable_change: reportable_change
            }
        );

        var cmd = zigbeecmd.configureReport(this.IEEEaddress, this.NWKaddress, CLUSTERID, reports, this.cluster_endpoint);
        this.transport.send(cmd);

        // read the settings
        setTimeout(
            () => {
                this.read_settings();
            },
            500
        );

        // try to resend the voltage report, experimental as some devices do not send voltage reports
        //setTimeout(
        //    () => {
        //        this.configure_voltage_report();
        //    },
        //    2000
        //);
    }

    on_bind_complete() {
        try {
            super.on_bind_complete();
            logger.debug("ZigbeeEcMeasureFeature " + this.IEEEaddress + " 0B04 on_bind_complete()");
            this.configure_report();
        }
        catch (err) {
            logger.error("ZigbeeEcMeasureFeature on_bind_complete() error: %j", err);
        }
    }

    on_device_contacting(payload) {
        super.on_device_contacting(payload);
    }

    on_report_configured() {
        super.on_report_configured();
        logger.debug("ZigbeeEcMeasureFeature " + this.IEEEaddress + " on_report_configured()");
    }

    on_device_online(properties) {
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        if (this.IEEEaddress && this.NWKaddress) {
            super.on_device_online();
        }
    }

    readpower() {
        var attributes = [0x05, 0x05, 0x0b, 0x05];
        var cmd = zigbeecmd.readAttributes(this.IEEEaddress, this.NWKaddress, 0x0b04, attributes, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    read_settings() {
        var attributes = [0x00, 0x06, 0x01, 0x06, 0x05, 0x06, 0x04, 0x06];
        var cmd = zigbeecmd.readAttributes(this.IEEEaddress, this.NWKaddress, 0x0b04, attributes, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    get_powermultiplier() {
        var cmd = zigbeecmd.readPowerMultiplier(this.IEEEaddress, this.NWKaddress, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    get_powerdivisor() {
        var cmd = zigbeecmd.readPowerDivisor(this.IEEEaddress, this.NWKaddress, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    read(payload, callback) {
        try {
            super.read(payload, callback, 7000);
            // do the reading
            this.readpower();
            //
        }
        catch (err) {
            callback(err);
        }
    }

    propread() {
        try {
            setTimeout(
                () => {
                    logger.debug("ZigbeeEcMeasureFeature propread()");
                    // do property readings
                    this.readpower();
                },
                2500
            );
            //
        }
        catch (err) {
            logger.error(`ZigbeeEcMeasureFeature propread() error: ${err.message}`);
        }
    }

    configure() {
    }

    //
}

module.exports = ZigbeeEcMeasureFeature;