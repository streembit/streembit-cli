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

    create_event_handlers() {
        super.create_event_handlers();
    }

    on_endpoint_receive(payload) {

    }

    on_data_received(payload) {
        if (!payload || !payload.type) {
            return;
        }

        try {
            //console.log("ZigbeeDevice on_data_received payload.type: " + payload.type);
            if (payload.type == iotdefinitions.EVENT_RADIO_ERROR) {
                console.log("EVENT_RADIO_ERROR: " + util.inspect(payload));
                if (payload.error) {
                    this.errors.push(payload.error)
                }
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ENDPOINTSRCV) {
                this.set_property_item(payload.devicedetails);
                console.log("endpoints: " + util.inspect(payload.devicedetails));
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_CLUSTERSRCV) {
                this.details.descriptors.set(payload.descriptor.endpoint, payload.descriptor.clusters);                
                this.features.forEach((feature, key, map) => {
                    feature.on_clusterlist_receive(payload.descriptor);
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
                var properties = payload.devicedetails;
                if (properties && Array.isArray(properties) && properties.length) {
                    this.active = true;
                    this.set_property_item(properties);
                    logger.debug("ZigbeeDevice address64: " + this.details.address64);
                    logger.debug("ZigbeeDevice address16: " + this.details.address16);
                }

                // call the device online event handler of each features
                this.features.forEach((feature, key, map) => {
                    feature.on_device_online(properties);
                });
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

}

module.exports = ZigbeeDevice;