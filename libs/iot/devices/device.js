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


const events = require("libs/events");
const logger = require('libs/logger');
const constants = require("libs/constants");
const iotdefinitions = require("libs/iot/definitions");

class Device {

    constructor(id, device, cmdbuilder, transport) {
        this.id = id;
        this.type = device.type;
        this.protocol = device.protocol;
        this.profile = device.profile;
        this.settings = device.setting;
        this.m_details = {};

        this.command_builder = cmdbuilder;
        this.transport = transport;

        this.m_active = false;

        this.features = new Map();

        this.errors = [];

        var array = device.features;
        if (array && Array.isArray(array) && array.length > 0) {
            for (var i = 0; i < array.length; i++) {
                try {
                    var feature_name = iotdefinitions.FEATURETYPEMAP[array[i].function];
                    var feature_lib = "libs/iot/devices/feature/" + this.protocol + "/" + feature_name;
                    var feature_obj = require(feature_lib);
                    var feature_handler = new feature_obj(this, array[i]); 
                    if (feature_handler) {
                        this.features.set(array[i].function, feature_handler);
                        logger.debug("feature " + array[i].function + " added to device " + this.id);
                    }
                }
                catch (err) {
                    logger.error("add feature " + array[i].function + " handler error: %j", err);
                }               
            }
        }
    }

    get active() {
        return this.m_active;
    }

    set active(value) {
        this.m_active = value;
    }

    get details() {
        return this.m_details;
    }

    set details(value) {
        this.m_details = value;
    }

    set_property_item(properties) {
        if (properties && Array.isArray(properties) && properties.length) {
            properties.forEach(
                (item) => {
                    if (item.hasOwnProperty("name") && item.hasOwnProperty("value")) {
                        this.details[item.name] = item.value;
                    }
                }
            );
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
                    else if (payload.type == iotdefinitions.EVENT_DEVICE_BINDSUCCESS) {
                        this.set_property_item(payload.devicedetails);
                        // call the features on_device_contacting method
                        this.features.forEach((feature, key, map) => {
                            feature.on_bind_complete(payload);
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
                    else if (payload.type == iotdefinitions.EVENT_DEVICE_ACTIVATED) {
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


    //on_property_update(payload) {
    //    var prop = payload.property;
    //    if (prop && prop.name) {
    //        this.details[prop.name] = prop.value;
    //    }
    //    logger.debug("device details" + this.id + " property " + prop.name + " update to: " + prop.value);
    //}

    on_active_device(payload) {
        this.active = true;
        // call the features on_activated
        this.features.forEach((feature, key, map) => {
            feature.on_activated(payload);
        });
    }

    update_property(name, value) {
        if (name) {
            this.details[name] = value;
        }

        //this.features.forEach((feature, key, map) => {
        //    feature[name] = value;
        //});
    }

    //on_contacting(payload) {
    //    this.features.forEach((feature, key, map) => {
    //        feature.on_contacting(payload);
    //    });
    //}

    update_properties(property_set) {
        if (!property_set) {
            return;
        }

        for (var property in property_set) {
            // propertyName is what you want.
            // You can get the value like this: myObject[propertyName]
            this.details[property] = property_set[property];

            if (property == "address64") {
                this.features.forEach((feature, key, map) => {
                    feature.address64 = property_set[property];
                });
            }

            if (property == "address16") {
                this.features.forEach((feature, key, map) => {
                    feature.address16 = property_set[property];
                });
            }
        }
    }

    update_active(isactive, payload) {
        this.active = isactive;
        if (isactive && payload) {
            this.on_active_device(payload);
        }
        logger.debug("device " + this.id + " is active");
    }

    send_device_details(callback) {
        var result = {
            payload: {
                details: this.details
            }
        };
        callback(null, result);
    }

    configure_reports(payload, callback) {
        var reports = payload.reports;
        // must be an array
        if (!reports || !Array.isArray(reports)) {
            return callback("nvalid reports collection at configure reports")
        }

        reports.forEach(
            (report) => {
                var iotfeature = report.feature;
                var feature = this.features.get(iotfeature);
                if (!feature) {
                    return callback("the feature handler is not available at configure reports")
                }

                feature.configure_report(payload.pkhash, report);
            }
        );

        callback(
            null,
            {
                payload: {
                    report_created: true
                }
            }
        );
    }


    executecmd(payload, callback) {
        var obj = this;
        var iotfeature = payload.feature;
        // get the feature
        if (iotfeature) {
            obj = this.features.get(iotfeature);
            if (!obj) {
                return callback("The feature handler is not available for the device")
            }
        }

        //if (!this.active) {
        //    return callback("The device is inactive")
        //}

        switch (payload.cmd) {
            case constants.IOTCMD_DEVICE_DETAILS:
                this.send_device_details(callback);
                break;
            case constants.IOTCMD_CONFIGURE_REPORT:
                this.configure_reports(payload, callback);
                break;
            case constants.IOTCMD_TOGGLE:
                obj.toggle(callback);
                break;
            case constants.IOTCMD_READVALUES:
                obj.read(callback);
                break;            
            default:
                callback("invalid command");
                break;
        }
    }
}


module.exports = Device;