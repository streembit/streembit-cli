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
const IoTReport = require('./iotreport');
const iotdefinitions = require("libs/iot/definitions");
const util = require("util");

class IoTFeature {
    constructor(device, feature) {
        if (!device) {
            throw new Error("IoTFeature constructor error: Invalid device ID");
        }
        this.device = device;
        if (!device.id) {
            throw new Error("IoTFeature constructor error: Invalid device ID");
        }
        this.deviceid = device.id;  // parent id, in case if Zigbee this is the address64 as well
        this.type = feature.type;
        this.settings = feature.setting;
        this.isactive = false;

        this.datareceived = false;

        this.callbacks = new Map();
    }

    on_bind_complete() {
    }

    on_clusterlist_receive() {
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

    on_activated(payload) {
    }

    on_device_contacting(payload) {
    }

    on_bind_complete(payload) {
    }

    read(payload, callback, timeout) {
        if (!callback && typeof callback != "function") {
            return;
        }

        let txn = payload.txn;
        if (!txn) {
            return callback("invalid txn in payload");
        }

        this.callbacks.set(txn, callback);

        setTimeout(
            () => {
                if (this.callbacks.has(txn)) {
                    let cbfn = this.callbacks.get(txn);
                    cbfn(constants.IOT_ERROR_TIMEDOUT);
                    this.callbacks.delete(txn);
                }
            },
            timeout
        );      
    }

    configure() {
    }

    //
}


module.exports = IoTFeature;