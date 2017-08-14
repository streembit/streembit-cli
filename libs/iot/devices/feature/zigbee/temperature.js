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
const TemperatureFeature = require("../temperature");
const events = require("libs/events");
const logger = require("libs/logger");
const util = require('util');

const TEMPSENS_TIMEOUT = 10000; 

class ZigbeeTemperatureFeature extends TemperatureFeature {

    constructor(device, feature) {
        super(device, feature);     
        this.clusters = feature.clusters;
        this.ispolling = (feature.settings && feature.settings.ispolling) ? feature.settings.ispolling : false;
        this.long_poll_interval = (feature.settings && feature.settings.long_poll_interval) ? feature.settings.long_poll_interval : -1;
        this.longpolling_enabled = this.ispolling && this.long_poll_interval > 0;    
        this.polling_timer = 0;        

        logger.debug("Initialized a Zigbee temperature sensor feature for device id: " + this.deviceid + ", ispolling: " + this.ispolling + " long_poll_interval: " + this.long_poll_interval);        
    }

    on_datareceive_event(properties) {
        try {
            if (!Array.isArray(properties) || !properties.length) {
                return;
            }

            properties.forEach(
                (item) => {
                    if (item.property == iotdefinitions.PROPERTY_TEMPERATURE) {
                        try {
                            var val = new Number(item.value);
                            this.temperature = val.toFixed(2);
                            //logger.debug("TemperatureFeature on_datareceive_event " + item.property + ": " + this.temperature);
                            //this.emit(iotdefinitions.PROPERTY_TEMPERATURE, this.temperature);
                            if (!this.datareceived) {
                                this.datareceived = true;
                            }
                        }
                        catch (err) {
                            logger.error("TemperatureFeature on_datareceive_event() property iotdefinitions.PROPERTY_TEMPERATURE error: %j", err);
                        }
                    }
                }
            );
        }
        catch (err) {
            logger.error("TemperatureFeature on_datareceive_event() error: %j", err);
        }
    }

    iscluster(cluster) {
        var exists = this.clusters.indexOf(cluster);
        return (exists > -1) ? true : false;
    }

    on_bind_complete() {
        var cluster = 0x0402;
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
        var cmd = commandbuilder.configureReport(device_details, cluster, reports);
        transport.send(cmd);
    }

    on_clusterlist_receive(payload) {
        var txn = 0x52;
    }

    on_report_configured() {
        /*
        try {
            super.on_activated(payload);

            if (this.longpolling_enabled) {
                this.start_polling();
            }
            else {
                this.read_temperature();
            }
        }
        catch (err) {
            logger.error("TemperatureFeature on_activated error %j", err);
        }
        */
    }

    on_activated(payload) {        
    }

    on_device_contacting(payload) {
        if (this.longpolling_enabled) {
            this.start_polling();
        }
        else {
            this.read_temperature();
        }
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
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.pollCheckIn(device_details, TEMPSENS_TIMEOUT);
        transport.send(cmd);
    }

    read_temperature(callback) {
        var transport = this.device.transport;
        var commandbuilder = this.device.command_builder;
        var device_details = this.device.details;
        var cmd = commandbuilder.readTemperature(device_details, TEMPSENS_TIMEOUT);
        transport.send(cmd);
    }


    read(payload, callback) {
        try {    
            super.read(payload, callback, TEMPSENS_TIMEOUT);
            // do the reading
            this.read_temperature();
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