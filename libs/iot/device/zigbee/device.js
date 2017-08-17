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
const Device = require("libs/iot/device/device");
const events = require("libs/events");
const logger = require("libs/logger");
const config = require("libs/config");
const util = require('util');
const async = require('async');
const zigbeecmd = require("libs/iot/protocols/zigbee/commands");

class ZigbeeDevice extends Device {

    constructor(id, device, transport) {
        try {
            super(id, device, transport);

            this.details.address64 = 0;
            this.details.address16 = 0;
            this.details.descriptors = new Map();

            logger.debug("Initialized Zigbee device id: " + id );
        }
        catch (err) {
            throw new Error("IoTEndDevice constructor error: " + err.message);
        }
    }

    on_device_online(payload) {
        this.details.address64 = payload.address64;
        this.details.address16 = payload.address16;
        logger.debug("ZigbeeDevice address64: " + this.details.address64 + " online");
        logger.debug("ZigbeeDevice address16: " + this.details.address16 + " online");

        // send a ZDO 0x0005 "Active Endpoint Request"
        var cmd = zigbeecmd.active_endpoint_request(this.details.address64, this.details.address16);
        this.transport.send(cmd);

        // call the device online event handler of each features
        this.features.forEach((feature, key, map) => {
            feature.on_device_online(payload);
        });
    }

    on_endpoint_receive(payload) {
        if (!payload || !payload.endpoints) {
            return;
        }

        this.details.endpoints = payload.endpoints;
        logger.debug("ZigbeeDevice " + this.id + " endpoints: " + util.inspect(this.details.endpoints));

        async.eachSeries(
            payload.endpoints,
            (endpoint, callback) => {
                // send a ZDO 0x0004 Simple Descriptor Request
                var cmd = zigbeecmd.simple_descriptor_request(this.details.address64, this.details.address16, endpoint);
                this.transport.send(cmd);
                callback();
            },
            (err) => {
                if (err) {
                    logger.error("ZigbeeDevice on_endpoint_receive() async.eachSeries() simple_descriptor_request error: %j", err)
                }
            }
        );       
    }

    on_device_announce(payload) {
        this.details.address64 = payload.address64;
        this.details.address16 = payload.address16;
        logger.debug("Device joined: " + this.id + " address16: " + this.details.address16);

        // send a ZDO 0x0005 "Active Endpoint Request"
        var cmd = zigbeecmd.active_endpoint_request(this.details.address64, this.details.address16);
        this.transport.send(cmd);
    }

    on_clusterlist_receive(payload) {
        if (payload && payload.descriptor && payload.descriptor.endpoint && payload.descriptor.clusters) {
            // add the cluster list to the map
            this.details.descriptors.set(payload.descriptor.endpoint, payload.descriptor.clusters);

            if (payload.descriptor.clusters.indexOf("0000") > -1) {
                // get the device info
                var attributes = [0x03, 0x00, 0x04, 0x00, 0x05, 0x00];
                var cmd = zigbeecmd.readAttributes(this.details.address64, this.details.address16, 0x0000, attributes, payload.descriptor.endpoint);
                this.transport.send(cmd);
            }
            else {
                this.on_device_info_completed();
            }
        }
    }

    get_device_info() {

        var descriptors = [];
        this.details.descriptors.forEach(
            (clusters, endpoint) => {
                descriptors.push(
                    {
                        endpoint: endpoint,
                        clusters: clusters
                    }
                );
            }
        );

        var data = {
            deviceid: this.id,
            type: this.type,
            protocol: this.protocol,
            address64: this.details.address64,
            address16: this.details.address16,
            hwversion: this.details.hwversion || 0,
            manufacturername: this.details.manufacturername || 0,
            modelidentifier: this.details.modelidentifier || 0,
            ispermitted: this.ispermitted,
            isblacklisted: this.isblacklisted,
            descriptors: descriptors //JSON.stringify(descriptors)
        };
        return data;
    }

    notify_device_info() {     
        var data = {
            payload: this.get_device_info()
        };
        //console.log("sending for " + this.deviceid + " EVENT_ENDDEVICE_JOINED: " + util.inspect(data));
        events.emit(iotdefinitions.EVENT_NOTIFY_USERS, this.id, data);
        //
    }

    on_device_info_completed() {
        try {
            if (!this.isblacklisted && !this.ispermitted) {
                // ask the user if the device is permitted
                this.notify_device_info();
                //
            }
            else if (!this.isblacklisted && this.ispermitted) {
                this.features.forEach((feature, key, map) => {
                    feature.on_clusterlist_receive(this.details.descriptors);
                });
            }
        }
        catch (err) {
            logger.error("on_device_info_completed() error: %j", err);
        }
    }

    on_device_info(payload) {
        if (payload && payload.properties) {
            for (var property in payload.properties) {
                this.details[property] = payload.properties[property];
                console.log(property + ":" + this.details[property]);
            }
        }

        this.on_device_info_completed();
    }

    on_data_received(payload) {
        if (!payload || !payload.type) {
            return;
        }

        try {
            //console.log("ZigbeeDevice on_data_received payload.type: " + payload.type);
            if (payload.type == iotdefinitions.EVENT_RADIO_ERROR && payload.error) {
                this.errors.push(payload.error);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ANNOUNCE) {
                this.on_device_announce(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ONLINE) {
                this.on_device_online(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ENDPOINTSRCV) {
                this.on_endpoint_receive(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_CLUSTERSRCV) {
                this.on_clusterlist_receive(payload);    
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_INFO) {
                this.on_device_info(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_BINDSUCCESS) {
                this.features.forEach((feature, key, map) => {
                    if (feature.iscluster(payload.cluster)) {
                        feature.on_bind_complete();
                    }
                });
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_CONTACTING) {
                this.set_property_item(payload.devicedetails);
                // call the features on_device_contacting method
                this.features.forEach((feature, key, map) => {
                    feature.on_device_contacting(payload);
                });
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_PROPERTY_UPDATE) {
                this.set_property_item(payload.properties);
            }
            else if (payload.type == iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE && payload.properties && Array.isArray(payload.properties) && payload.properties.length) {
                var propnames = [];
                payload.properties.forEach(
                    (prop) => {
                        propnames.push(prop.property);
                    }
                );
                this.features.forEach((feature, key, map) => {
                    if (feature.is_property_handled(propnames)){
                        feature.on_datareceive_event(payload.properties);
                    }
                });
            }
        }
        catch (err) {
            logger.error("Device on_data_received() error: %j", err);
        }
    }


    enable_join(payload, callback) {
    }
}

module.exports = ZigbeeDevice;