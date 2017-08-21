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
const iotdefinitions = require("libs/iot/definitions");
const Devices = require("libs/devices");

class Device {

    constructor(id, device, transport) {
        if (!id) {
            throw new Error("Device constructor error: invalid ID paramater");
        }

        this.id = id;
        this.type = device.type;
        this.protocol = device.protocol;
        this.profile = device.profile;
        this.settings = device.setting;
        this.mcu = device.mcu;
        this.permission = device.permission;
        this.name = device.name;

        this.m_details = {};
        try {
            if (device.details && typeof device.details == "string") {
                let deteailsobj = JSON.parse(device.details);
                if (deteailsobj) {
                    this.m_details = deteailsobj;
                }
            }
            
        }
        catch (err) { }        

        this.transport = transport;
        this.m_active = false;

        // this should store the device specific features string from the database, in case of Zigbee the clusters i.e. 0006, 0b04 etc.
        if (device.featuredef && typeof device.featuredef == "string") {
            this.featuredef = device.featuredef;
        }
        else {
            this.featuredef = device.features;
        }

        this.features = new Map();  
        if (this.featuredef && this.featuredef.length) {
            this.setfeatures();
        }

        this.errors = [];        
    }

    get featuretypes() {
        var types = [];
        // get it from the featuredef
        if (!this.featuredef) {
            throw new Error("featuretypes can be called if the featuredef property is not empty");
        }

        if (typeof this.featuredef != "string") {
            throw new Error("featuretypes can be called if the featuredef property is a string");
        }

        var flist = 0;
        try {
            flist = JSON.parse(this.featuredef);
        }
        catch (e) {
            throw new Error("JSON parse of featuredef failed. The featuredef variable must be a valid array")
        }

        if (flist.length) {
            flist.forEach(
                (feature) => {
                    let feature_type = iotdefinitions.ZIGBEE_CLUSTERMAP[feature]; 
                    types.push(feature_type);
                }
            );
        }

        return types;
    }

    setfeatures() {
        try {
            if (!this.featuredef || typeof this.featuredef != "string") {
                throw new Error("the Device setfeatures() can be called if the featuredef property is not empty");
            }

            var flist = 0;
            try {
                flist = JSON.parse(this.featuredef);
            }
            catch (e) {
                throw new Error("JSON parse of featuredef failed. The featuredef variable must be a valid array")
            }

            if (flist.length) {
                flist.forEach(
                    (feature) => {
                        try {
                            let feature_type = iotdefinitions.ZIGBEE_CLUSTERMAP[feature]; // maps the Zigbee cluster to our generic feature type
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
                            logger.error("setfeatures() feature type " + feature + " error: %j", err);
                        }
                    }
                );
            }
        }
        catch (err) {
            logger.error("Device setfeatures() error: %j", err)
        }
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
            case iotdefinitions.IOTCMD_DEVICE_DETAILS:
                this.send_device_details(callback);
                break;
            case iotdefinitions.IOTCMD_TOGGLE:
                obj.toggle(payload, callback);
                break;
            case iotdefinitions.IOTCMD_READVALUES:
                obj.read(payload, callback);
                break;            
            default:
                callback("invalid command: " + payload.cmd);
                break;
        }
    }

    disjoin() {
    }
}


module.exports = Device;