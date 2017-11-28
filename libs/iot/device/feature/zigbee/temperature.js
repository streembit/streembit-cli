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
const iotdefinitions = require("libs/iot/definitions");
const TemperatureFeature = require("../temperature");
const logger = require("streembit-util").logger;
const util = require('util');
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");

let CLUSTERID = 0x0402;

class ZigbeeTemperatureFeature extends TemperatureFeature {

    constructor(deviceid, feature, feature_type, transport) {
        super(deviceid, feature, feature_type, transport);     

        this.cluster = feature.toLowerCase();
        let clusternum = parseInt(this.cluster, 16);
        if (clusternum != CLUSTERID) {
            throw new Error("ZigbeeTemperatureFeature " + feature + " is invalid cluster");
        }

        this.cluster_endpoint = -1;
        this.IEEEaddress = 0;
        this.NWKaddress = 0;
        this.ispolling = (feature.settings && feature.settings.ispolling) ? feature.settings.ispolling : false;
        this.long_poll_interval = (feature.settings && feature.settings.long_poll_interval) ? feature.settings.long_poll_interval : -1;
        this.longpolling_enabled = this.ispolling && this.long_poll_interval > 0;    
        this.polling_timer = 0;      

        this.report_max = 0x003c; // 60 seconds  

        this.property_names.push(iotdefinitions.PROPERTY_TEMPERATURE);

        logger.debug("Initialized a Zigbee temperature sensor feature");        
    }

    on_datareceive_event(properties) {
        try {
            if (Array.isArray(properties) && properties.length) {
                properties.forEach(
                    (item) => {
                        if (item.property == iotdefinitions.PROPERTY_TEMPERATURE) {
                            var val = new Number(item.value);
                            this.temperature = val.toFixed(2);                            
                            let data = {
                                payload: {
                                    event: iotdefinitions.EVENT_PROPERTY_REPORT,
                                    temperature: this.temperature 
                                }
                            };
                            super.on_datareceive_event(data, iotdefinitions.EVENT_NOTIFY_USERS);
                            this.last_update_time = Date.now();
                            logger.debug("TemperatureFeature on_datareceive_event " + item.property + ": " + this.temperature);
                        }
                    }
                );
            }
        }
        catch (err) {
            logger.error("ZigbeeTemperatureFeature on_datareceive_event() error: %j", err);
        }        
    }

    iscluster(param) {
        return this.cluster == param;
    }

    on_device_announce(properties) {
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        logger.debug("ZigbeeTemperatureFeature on_device_announce() IEEEaddress: " + this.IEEEaddress + " NWKaddress: " + this.NWKaddress);

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
        var txn = 0x52;
        logger.debug("ZigbeeTemperatureFeature cluster 0402, send bind request at endpoint: " + this.cluster_endpoint);
        var cmd = zigbeecmd.bind(txn, this.IEEEaddress, this.NWKaddress, CLUSTERID, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    on_clusterlist_receive(endpoint) {
        try {
            logger.debug("ZigbeeTemperatureFeature " + this.IEEEaddress + " on_clusterlist_receive()");
            this.cluster_endpoint = endpoint; 
            this.bind();
        }
        catch (err) {
            logger.error("ZigbeeTemperatureFeature on_clusterlist_receive() error: %j", err);
        }
    }

    configure_report() {
        logger.debug("ZigbeeTemperatureFeature send configure report");
        var attribute = 0x0000, datatype = 0x29, mininterval = 0x05, maxinterval = 0x005a;
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

    on_bind_complete() {
        try {
            super.on_bind_complete();
            logger.debug("ZigbeeTemperatureFeature " + this.IEEEaddress + " 0x0402 on_bind_complete()");
            this.configure_report();
        }
        catch (err) {
            logger.error("ZigbeeTemperatureFeature on_bind_complete() error: %j", err);
        }
    }

    on_report_configured() {
        super.on_report_configured();
        logger.debug("ZigbeeTemperatureFeature " + this.IEEEaddress + " on_report_configured()");
    }

    on_device_online(properties) {       
        this.IEEEaddress = properties.address64;
        this.NWKaddress = properties.address16;
        logger.debug("ZigbeeTemperatureFeature IEEEaddress: " + this.IEEEaddress + " NWKaddress: " + this.NWKaddress);
        if (this.IEEEaddress && this.NWKaddress) {
            super.on_device_online();
        }
    }

    on_device_contacting(payload) {
    }

    start_polling() {

        this.read_temperature();

        if (this.polling_timer) {
            clearInterval(this.polling_timer);
        }

        this.polling_timer = setInterval(
            () => {
                //console.log("poll temperature data");
                this.read_temperature();
            },
            ((this.long_poll_interval /4)*1000)
        );
    }

    checkin(callback) {
        var cmd = zigbeecmd.pollCheckIn(this.IEEEaddress, this.NWKaddress, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    read_temperature(callback) {
        var cmd = zigbeecmd.readTemperature(this.IEEEaddress, this.NWKaddress, this.cluster_endpoint);
        this.transport.send(cmd);
    }

    read(payload, callback) {
        try {    
            let current_time = Date.now();
            let last_update_elapsed = current_time - this.last_update_time;
            let is_report_available = last_update_elapsed < this.report_max * 1000
            //console.log("ZigbeeTemperatureFeature last_update_elapsed: " + last_update_elapsed + " is_report_available: " + is_report_available);
            if (is_report_available) {
                var data = {
                    payload: {
                        temperature: this.temperature
                    }
                };
                callback(null, data);                
            }
            else {
                super.read(payload, callback, (this.report_max * 1000 - 1 ));
                // do the reading
                this.read_temperature();
            }
            //
        }
        catch (err) {
            callback(err);
        }
    }

    configure() {
    }

}

module.exports = ZigbeeTemperatureFeature;