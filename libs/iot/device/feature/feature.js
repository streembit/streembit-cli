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
const EventEmitter = require('events');
const iotdefinitions = require("libs/iot/definitions");
const util = require("util");

class IoTFeature {
    constructor(deviceid, feature, featuretype, transport) {
        if (!feature || typeof feature != "string" ) {
            throw new Error("IoTFeature error, the feature cannot be empty and must be a string");
        }

        if (!featuretype) {
            throw new Error("IoTFeature error, the feature type must be bigger than 0");
        }

        this.featuredef = feature;
        this.deviceid = deviceid;
        this.transport = transport;
        this.type = featuretype;
        this.settings = 0;
        this.isactive = false;
        this.datareceived = false;
        this.callbacks = new Map();
        this.property_names = [];
        this.isonline = false;
        this.last_update_time = 0;
        this.initialized = false;
    }

    on_datareceive_event(data, event) {
        if (this.callbacks.size > 0) {
            this.callbacks.forEach(
                (cbfn, key, map) => {
                    cbfn(null, data);
                }
            );
            // clear the callbacks
            this.callbacks.clear();
        }
        else {
            //console.log("sending datarcv event " + util.inspect(frame));
            data.payload.deviceid = this.deviceid;
            data.payload.feature = this.type;
            events.emit(event, this.deviceid, data);
        }        
    }

    on_device_online() {
        this.isonline = true;
    }

    on_device_contacting(payload) {
    }

    read(payload, callback, timeout) {        
        if (!callback && typeof callback != "function") { return; }

        if (this.isonline == false) {
            throw new Error(iotdefinitions.IOT_ERROR_DEVICE_OFFLINE);
        }

        let txn = payload.txn;
        if (!txn) {
            throw new Error("invalid txn in payload");
        }

        try {   
            this.callbacks.set(txn, callback);
            setTimeout(
                () => {
                    if (this.callbacks.has(txn)) {
                        let cbfn = this.callbacks.get(txn);
                        cbfn(iotdefinitions.IOT_ERROR_TIMEDOUT);
                        this.callbacks.delete(txn);
                    }
                },
                timeout
            );
        }
        catch (err) {
            try {
                callback(err.message);
            }
            catch (e) { }

            try {                
                if (txn && this.callbacks.has(txn)) {
                    this.callbacks.delete(txn);
                }
            }
            catch(e){}
        }
    }

    is_property_handled(properties) {
        if (properties && Array.isArray(properties)) {
            for (let i = 0; i < this.property_names.length; i++) {
                if (properties.indexOf(this.property_names[i]) > -1) {
                    return true;
                }
            }
        }

        return false;
    }

    configure() {
    }

    //
}


module.exports = IoTFeature;