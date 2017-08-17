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
const EcMeasureFeature = require("../ecmeasure");
const events = require("libs/events");
const logger = require("libs/logger");
const async = require("async");
const util = require('util');
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");


class ZigbeeEcMeasureFeature extends EcMeasureFeature {

    constructor(deviceid, feature, transport) {
        super(deviceid, feature, transport);  
        this.cluster = feature.cluster;
        this.power_divisor = 0;
        this.power_multiplier = 1;

        var settings = 0;
        try {
            if (feature.settings) {
                settings = JSON.parse(feature.settings);
            }
        }
        catch (err) { }

        if (settings) {
            this.power_divisor = (settings.acformatting && settings.acformatting.divisor) ? settings.acformatting.divisor : 0;
            this.power_multiplier = (settings && settings.acformatting && settings.acformatting.multiplier) ? settings.acformatting.multiplier : 1;
        }

        this.property_names.push(iotdefinitions.PROPERTY_ACTIVEPOWER);
        this.property_names.push(iotdefinitions.PROPERTY_VOLTAGE);
        this.property_names.push(iotdefinitions.PROPERTY_POWERMULTIPLIER);
        this.property_names.push(iotdefinitions.PROPERTY_POWERDIVISOR);

        this.cluster_endpoint = -1;
        this.IEEEaddress = 0;
        this.NWKaddress = 0;

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
                        let voltage = item.value;
                        this.voltage = voltage;                        
                        data.payload.voltage = voltage;
                        logger.debug("ZigbeeEcMeasureFeature voltage: %d Volt", this.voltage);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_POWERMULTIPLIER) {
                        this.power_multiplier = item.value;
                        logger.debug("PROPERTY_POWERMULTIPLIER: %d", this.power_multiplier);
                    }
                    else if (item.property == iotdefinitions.PROPERTY_POWERDIVISOR) {
                        this.power_divisor = item.value;
                        logger.debug("PROPERTY_POWERDIVISOR: %d", this.power_divisor);                        
                    }
                }
            );

            //console.log("ZigbeeEcMeasureFeature on_datareceive_event data: " + util.inspect(data));
            if (data.payload.hasOwnProperty("voltage") || data.payload.hasOwnProperty("power_consumption")) {
                super.on_datareceive_event(data, iotdefinitions.EVENT_PROPERTY_REPORT);
            }
        }
        catch (err) {
            logger.error("EcMeasureFeature on_datareceive_event() error: %j", err);
        }
    }    

    iscluster(cluster) {
        return this.cluster == cluster;
    }

    on_bind_complete() {
        try {
            var cluster = 0x0b04;
            var reports = [];
            // power
            var attribute = 0x050b, datatype = 0x29, mininterval = 0x01, maxinterval = 0x0030, reportable_change = 0x0005;
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
            attribute = 0x0505, datatype = 0x21, mininterval = 0x02, maxinterval = 0x0031, reportable_change = 0x0005;
            reports.push(
                {
                    attribute: attribute,
                    datatype: datatype,
                    mininterval: mininterval,
                    maxinterval: maxinterval,
                    reportable_change: reportable_change
                }
            );

            var cmd = zigbeecmd.configureReport(this.IEEEaddress, this.NWKaddres, cluster, reports, this.cluster_endpoint);
            this.transport.send(cmd);

            // read the settings
            setTimeout(
                () => {
                    this.read_settings();
                },
                1000
            );

        }
        catch (err) {
            logger.error("EcMeasureFeature on_bind_complete() error: %j", err);
        }
    }

    on_device_contacting(payload) {
        super.on_device_contacting(payload);
    }

    on_device_contacting(payload) {
        // must send the report
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
                    if (cluster == "0b04") {
                        this.cluster_endpoint = descriptor.endpoint;
                        exists = true;
                    }
                }
            );

            if (exists) {
                logger.debug("ZigbeeEcMeasureFeature cluster 0B04 exists");

                // bind
                var txn = 0x51;
                var clusterid = 0x0b04;
                var cmd = zigbeecmd.bind(txn, this.IEEEaddress, this.NWKaddres, clusterid, this.cluster_endpoint);
                this.transport.send(cmd);
            }
        }
        catch (err) {
            logger.error("EcMeasureFeature on_clusterlist_receive() error: %j", err);
        }
    }

    readpower() {
        var attributes = [0x05, 0x05, 0x0b, 0x05];
        var cmd = zigbeecmd.readAttributes(this.IEEEaddress, this.NWKaddres, 0x0b04, attributes, this.cluster_endpoint);
        this.transport.send(cmd);        
    }

    read_settings() {
        var attributes = [0x05, 0x06, 0x04, 0x06];
        var cmd = zigbeecmd.readAttributes(this.IEEEaddress, this.NWKaddres, 0x0b04, attributes, this.cluster_endpoint);
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

    configure() {
    }

    //
}

module.exports = ZigbeeEcMeasureFeature;