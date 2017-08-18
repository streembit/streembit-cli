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

class Devices {

    constructor() {
        if (!instance) {
            instance = this;
            m_devices = new Map();
        }
        return instance;
    }

    static get devices() {
        return m_devices;
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

    static get_permitted_devices() {
        var list = [];
        Devices.devices.forEach(
            (item, key) => {
                if (item.permission == 1) {
                    list.push(item);
                }
            }
        );
        return list;
    }


    static get_device_by(deviceid) {
        var list = [];
        Devices.devices.forEach(
            (item, key) => {
                if (item.deviceid == deviceid) {
                    list.push(item);
                }
            }
        );
        return list;
    }

    static is_device_blacklisted(deviceid) {
        let device = Devices.devices.get(deviceid);
        if (device && device.permission == 2) {
            return true;
        }
        else {
            return false;
        }
    }

    static async update(device, callback) {
        try{
            let deviceid = device.id, permission = device.permission, name = device.name, features = device.featuredef;
            let dbdevice = Devices.devices.get(deviceid);
        
            let db = new Database();
            if (!dbdevice)  {
                // insert
                var details = device.details ? JSON.stringify(device.details) : null;
                await db.add_device(deviceid, device.type, device.protocol, device.mcu, name, details, permission, features);
                // update the local list
                Devices.devices.set(deviceid, device);
            }
            else {
                // update
                await db.update_device(deviceid, name, premission);
                dbdevice.name = name;
                dbdevice.premission = premission;
                Devices.devices.set(deviceid, dbdevice);
            }

            callback();
        }
        catch (err) {
            return callback(err);
        }

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
                .then(() => {
                    logger.debug("devices initialized, total devices: " + Devices.devices.size );
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




