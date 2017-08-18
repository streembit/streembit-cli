﻿/*
 
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
const Devices = require("libs/devices");

class Device {

    constructor(id, device, transport) {
        this.id = id;
        this.type = device.type;
        this.protocol = device.protocol;
        this.profile = device.profile;
        this.settings = device.setting;
        this.mcu = device.mcu;
        this.premission = device.premission;

        this.m_details = {};
        try {
            let deteailsobj = JSON.parse(device.details);
            if (deteailsobj) {
                this.m_details = deteailsobj;
            }
        }
        catch (err) { }        

        this.transport = transport;
        this.m_active = false;

        this.featuredef = 0;
        this.features = new Map();  
        if (device.features) {
            this.setfeatures(device.features);
        }

        this.errors = [];        
    }

    setfeatures(features) {
        try {
            this.featuredef = features;
            var flist = JSON.parse(features);
            if (flist.length) {
                flist.forEach(
                    (feature) => {
                        try {
                            let feature_type = iotdefinitions.CLUSTERMAP[feature];
                            let feature_name = iotdefinitions.FEATURETYPEMAP[feature_type];
                            let feature_lib = "libs/iot/device/feature/" + this.protocol + "/" + feature_name;
                            let feature_obj = require(feature_lib);
                            let feature_handler = new feature_obj(this.id, feature, feature_type, this.transport);
                            if (feature_handler) {
                                this.features.set(feature_type, feature_handler);
                                logger.debug("feature " + feature_type + " added to device " + this.id);
                            }
                        }
                        catch (err) {
                            logger.error("add feature " + array[i].type + " handler error: %j", err);
                        }
                    }
                );
            }
        }
        catch (err) { }
    }

    init() {        
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

    update_property(name, value) {
        if (name) {
            this.details[name] = value;
        }
    }


    update_properties(property_set) {
        if (!property_set) {
            return;
        }

        for (var property in property_set) {
            // propertyName is what you want.
            // You can get the value like this: myObject[propertyName]
            this.details[property] = property_set[property];
        }
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

        switch (payload.cmd) {
            case constants.IOTCMD_DEVICE_DETAILS:
                this.send_device_details(callback);
                break;
            case constants.IOTCMD_ENABLEDEVICEJOIN:
                this.enable_join(payload, callback);
                break;
            case constants.IOTCMD_TOGGLE:
                obj.toggle(callback);
                break;
            case constants.IOTCMD_READVALUES:
                obj.read(payload, callback);
                break;            
            default:
                callback("invalid command: " + payload.cmd);
                break;
        }
    }
}


module.exports = Device;