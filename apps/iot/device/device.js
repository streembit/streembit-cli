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


const logger = require("streembit-util").logger;
const iotdefinitions = require("apps/iot/definitions");
const Devices = require("libs/devices");
const TrackingEvent = require("./tracking_event");
const Users = require('libs/users');
const events = require("streembit-util").events;
const constants = require('libs/constants');


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
        this.users = new Users().users;

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

        this.init();
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

    // Send an event and track if it was handled
    send_tracking_event() {

    }

    // override this withe the protocol specific map function
    get_feature_type(feature) {
    }

    // override this withe the protocol specific map function
    get_feature_name(feature_type) {
    }

    is_feature_handled(feature) { }

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

            if (!flist.length) {
                return;
            }
 
            flist.forEach(
                (feature) => {
                    try {     
                        let feature_type = this.get_feature_type(feature); 
                        let feature_name = this.get_feature_name(feature_type);
                        if ((feature_type && feature_name) && !this.features.has(feature_type)) {
                            let feature_lib = "apps/iot/device/feature/" + this.protocol + "/" + feature_name;
                            let feature_obj = require(feature_lib);
                            let feature_handler = new feature_obj(this.id, feature, feature_type, this.transport);
                            if (feature_handler) {
                                this.features.set(feature_type, feature_handler);
                                logger.debug("feature " + feature_name + " added to device " + this.id);                                
                            }
                        }
                    }
                    catch (err) {
                        logger.error("setfeatures() feature type " + feature + " error: %j", err);
                    }
                }
            );
            
        }
        catch (err) {
            logger.error("Device setfeatures() error: %j", err)
        }
    }

    verifyfeatures(features) {
        try {
            // process only if the device was not comissioned
            if (this.permission == iotdefinitions.PERMISSION_ALLOWED || this.permission == iotdefinitions.PERMISSION_DENIED) {
                return;
            }

            if (!features || !Array.isArray(features) || !features.length) {
                return;
            }

            if (!this.featuredef) {
                let tmparr = [];
                for (let i = 0; i < features.length; i++) {
                    if (this.is_feature_handled(features[i])) {
                        tmparr.push(features[i]);                        
                    }
                }
                this.featuredef = JSON.stringify(tmparr);
            }
            else {
                let tmpdef = "";
                let clustersarray
                if (this.featuredef) {
                    let arr = JSON.parse(this.featuredef);
                    for (let i = 0; i < features.length; i++) {
                        if (this.is_feature_handled(features[i])){
                            if (arr.indexOf(features[i]) == -1) {
                                arr.push(features[i]);
                            }
                        }
                    }
                    this.featuredef = JSON.stringify(arr);
                }
            }

            this.setfeatures();

            //
        }
        catch (err) {
            logger.error("Device setfeatures() error: %j", err)
        }
    }

    init() {}

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

    get details_populated() {
        let populated = false;
        for (var prop in this.m_details) {
            populated = true;
        }
        return populated;
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

    send_device_users(callback) {
        const result = {
            payload: {
                users: Array.from(this.users.values())
            }
        };
        callback(null, result);
    }

    add_user(user, callback) {
        const users = new Users();
        users.add_user(user)
            .then(
                () => users.populate()
            ).then(
                () => {
                    this.users = new Users().users;

                    // send inform_users
                    events.taskinit(constants.TASK_INFORM_CONTACTS, { all: true });

                    const result = {
                        payload: {
                            result: 'success'
                        }
                    };
                    callback(null, result);
                }
            )
        .catch(err => {
            const result = {
                payload: {
                    result: err.message
                }
            };
            callback(null, result);
        });
    }

    update_user(user, callback) {
        const users = new Users();
        users.update_user(user)
            .then(
                () => users.populate()
            ).then(
                () => {
                    this.users = new Users().users;

                    // send inform_users
                    events.taskinit(constants.TASK_INFORM_CONTACTS, { all: true });

                    const result = {
                        payload: {
                            result: 'success'
                        }
                    };
                    callback(null, result);
                }
            )
        .catch(err => {
            const result = {
                payload: {
                    result: err.message
                }
            };
            callback(null, result);
        });
    }

    delete_user(uid, callback) {
        const users = new Users();
        users.delete_user(uid)
            .then(
                () => users.populate()
            ).then(
                () => {
                    this.users = new Users().users;

                    // send inform_users
                    events.taskinit(constants.TASK_INFORM_CONTACTS, { all: true });

                    const result = {
                        payload: {
                            result: 'success'
                        }
                    };
                    callback(null, result);
                }
            )
        .catch(err => {
            const result = {
                payload: {
                    result: err.message
                }
            };
            callback(null, result);
        });
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
                return callback("The feature handler is not available for the device, feature: " + iotfeature)
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
            case iotdefinitions.IOT_REQUEST_USER_LIST:
                this.send_device_users(callback);
                break;
            case iotdefinitions.IOTCMD_USER_ADD:
                this.add_user(payload.user, callback);
                break;
            case iotdefinitions.IOTCMD_USER_UPDATE:
                this.update_user(payload.user, callback);
                break;
            case iotdefinitions.IOTCMD_USER_DELETE:
                this.delete_user(payload.uid, callback);
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