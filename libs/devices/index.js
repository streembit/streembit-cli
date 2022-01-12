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


import { logger } from "streembit-util";
import { definitions as defs } from "../../apps/iot/definitions.js";
import IoTDevicesDb from "../../libs/database/devicesdb.js";

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

    static getdevices() {
        Devices.devices.clear();
        return new Promise((resolve, reject) => {
            var db = new IoTDevicesDb();
            db.devices().then(
                (rows) => {
                    rows.forEach(
                        (item) => {
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

    static async refresh() {
        try {
            await Devices.getdevices();
        }
        catch (err) {
            throw new Error("Devices refresh error: " + err.message);
        }
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
                if (item.permission == defs.PERMISSION_ALLOWED) {
                    list.push(item);
                }
            }
        );
        return list;
    }


    static get_devices_byid(deviceid) {
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

    static get_device(deviceid) {
        var device = null;
        if (Devices.devices.has(deviceid)) {
            device = Devices.devices.get(deviceid);
        }
        return device;
    }

    static is_device_blacklisted(deviceid) {
        let device = Devices.devices.get(deviceid);
        if (device && device.permission == defs.PERMISSION_DENIED) {
            return true;
        }
        else {
            return false;
        }
    }

    static async set_device_permission(deviceid, permission, callback) {        
        try {
            let db = new IoTDevicesDb();
            await db.update_device_permission(deviceid, permission);

            let dbdevice = Devices.devices.get(deviceid);
            dbdevice.permission = permission;

            Devices.refresh();

            callback();

            //
        }
        catch (err) {
            return callback(err);
        }

    }

    static async update(device, callback) {
        try{
            let deviceid = device.id, permission = device.permission, name = device.name;
            let features = device.featuredef;
            let dbdevice = Devices.devices.get(deviceid);
        
            let db = new IoTDevicesDb();
            if (!dbdevice)  {
                // insert
                var details = device.details ? JSON.stringify(device.details) : null;
                await db.add_device(deviceid, device.type, device.protocol, device.mcu, name, details, permission, features);
                // update the local list
                //Devices.devices.set(deviceid, device);
                Devices.refresh();
            }
            else {
                // update
                await db.update_device(deviceid, name, permission);
                dbdevice.name = name;
                dbdevice.permission = permission;
                Devices.devices.set(deviceid, dbdevice);
            }

            callback();
        }
        catch (err) {
            return callback(err);
        }
    }

    static async delete_device(deviceid, callback) {
        try {
            let db = new IoTDevicesDb();
            await db.delete_device(deviceid);

            // update the local list
            Devices.devices.delete(deviceid);

            callback();
        }
        catch (err) {
            return callback(err);
        }
    }

    populate() {
        return new Promise((resolve, reject) => {
            var db = new IoTDevicesDb();
            db.devices().then(
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

    async add(device) {
        try {
            var db = new IoTDevicesDb();
            let dbrow = await db.get_device(device.id);
            if (!dbrow) {
                // add to database
                logger.debug("add IoT device " + device.id + " to database");

                let deviceid = device.id,
                    type = device.type,
                    protocol = device.protocol,
                    mcu = device.mcu,
                    name = device.name,
                    permission = device.permission,
                    details = device.details ? JSON.stringify(device.details) : null,
                    features = device.features ? JSON.stringify(device.features) : null;

                await db.add_device(deviceid, type, protocol, mcu, name, details, permission, features);
            }
            else {
                logger.debug("device " + device.id + " exist in database ");
            }
        }
        catch (err) {
            logger.error("Device to DB error: " + err.message);
        }
    }

    // synchronise the devices with the config file
    async syncdevices() {
        try {
            logger.debug("creating IoT devices in the database");
            var conf = config.iot_config;
            var devices = conf.devices;
            for (let i = 0; i < devices.length; i++) {
                try {
                    await this.add(devices[i]);
                }
                catch (err) {
                    return Promise.reject(new Error(err.message));
                }
            }
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(new Error(err.message));
        }
    }

    async init(callback) {
        try {
            await this.syncdevices();
        }
        catch (err) {
            return callback("Devices initdb error: " + err.message);
        }

        try {
            await this.populate();
        }
        catch (err) {
            return callback("Devices populate error: " + err.message);
        }

        callback();

        //
    }
}

export default Devices;