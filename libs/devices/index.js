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


const logger = require("libs/logger");
const async = require("async");
const config = require("libs/config");
const Database = require("libs/database/devicesdb");

let instance = null;
let m_devices = null;
let m_features = null;

class Devices {

    constructor() {
        if (!instance) {
            instance = this;
            m_devices = new Map();
            m_features = [];
        }
        return instance;
    }

    static get devices() {
        return m_devices;
    }

    static set devices(value) {
        m_devices = value;
    }

    static get features() {
        return m_features;
    }

    static list() {
        var list = [];
        Devices.devices.forEach(
            (device, key) => {
                list.push(device);
            }
        );
        return list;
    }

    static get_devices_ids() {
        let list = [];
        let mapiter = Devices.devices.keys();
        for (let key of mapiter) {
            list.push(key);
        }
        return list;
    }

    static get_devices_by_protocol(protocol) {
        var list = [];
        Devices.devices.forEach(
            (item, key) => {
                if (item.protocol == protocol) {
                    list.push(item);
                }
            }
        );
        return list;
    }

    static get_features_by_deviceid(deviceid) {
        var list = [];
        Devices.features.forEach(
            (item, key) => {
                if (item.deviceid == deviceid) {
                    list.push(item);
                }
            }
        );
        return list;
    }

    features_from_db() {
        return new Promise((resolve, reject) => {
            var db = new Database();
            db.get_features().then(
                (rows) => {
                    rows.forEach(
                        (item) => {
                            Devices.features.push(item);
                        }
                    );
                    resolve();
                })
                .catch(
                    (err) => {
                        reject(err);
                    }
                );
        });
    }

    devices_from_db() {
        return new Promise((resolve, reject) => {
            var db = new Database();
            db.get_devices().then(
                (rows) => {
                    rows.forEach(
                        (item)=> {
                            Devices.devices.set(item.deviceid, item);
                        }
                    );
                    resolve();
                })
                .catch(
                    (err) => {
                        reject(err);
                    }
                );
        });
    }

    init(callback) {
        try {
            this.devices_from_db()
                .then(this.features_from_db)
                .then(() => {
                    logger.debug("devices initialized, total devices: " + Devices.devices.size + " features: " + Devices.features.length);
                    callback()
                })
                .catch((err) => callback(err));
        }
        catch (err) {
            callback("devices init error: " + err.message);
        }
    }
}


module.exports = Devices;




