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
const Device = require("libs/iot/devices/device");
const events = require("libs/events");
const logger = require("libs/logger");
const config = require("libs/config");
const util = require('util');

class ZigbeeDevice extends Device {

    constructor(id, device, cmdbuilder, transport) {
        try {
            super(id, device, cmdbuilder, transport);

            // zigbee coordinator endpoint
            this.sourceendpoint = 0;
            var devices = config.iot_config.devices;
            devices.forEach(
                (item) => {
                    if (item.type == constants.IOT_DEVICE_GATEWAY) {
                        this.details.sourceendpoint = (item.details && item.details.endpoint) ? item.details.endpoint : 0;
                    }
                });

            logger.debug("Initialized Zigbee device id: " + id + ", endpoint: " + this.details.sourceendpoint);
        }
        catch (err) {
            throw new Error("IoTEndDevice constructor error: " + err.message);
        }
    }

    create_event_handlers() {
        var device_datareceived_event = this.id + iotdefinitions.DATA_RECEIVED_EVENT;
        events.on(
            device_datareceived_event,
            (payload) => {
                try {
                    if (payload.type == iotdefinitions.EVENT_RADIO_ERROR) {
                        if (payload.error) {
                            this.errors.push(payload.error)
                        }
                    }
                    else if (payload.type == iotdefinitions.EVENT_DEVICE_ENDPOINTSRCV) {
                        this.set_property_item(payload.devicedetails);
                        console.log("endpoints: " + util.inspect(payload.devicedetails));
                    }
                    else if (payload.type == iotdefinitions.EVENT_DEVICE_CLUSTERSRCV) {
                        this.set_property_item(payload.devicedetails);
                        this.features.forEach((feature, key, map) => {
                            feature.on_clusterlist_receive();
                        });
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
                    else if (payload.type == iotdefinitions.EVENT_DEVICE_ONLINE) {
                        this.active = true;
                        this.set_property_item(payload.devicedetails);

                        // call the actived event handler of each features
                        this.features.forEach((feature, key, map) => {
                            feature.on_activated(payload);
                        });
                    }
                    else if (
                        payload.type == iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE &&
                        payload.properties && Array.isArray(payload.properties) &&
                        payload.properties.length) {
                        this.features.forEach((feature, key, map) => {
                            feature.on_datareceive_event(payload.properties);
                        });
                    }
                }
                catch (err) {
                    logger.error("Device " + device_datareceived_event + " event error: %j", err);
                }
                //
            }
        );
    }

    on_active_device(payload) {
        super.on_active_device(payload);
    }

}

module.exports = ZigbeeDevice;