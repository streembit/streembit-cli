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

const database = require("libs/database/database");

class IoTDevicesDb extends database{
    constructor() {
        super();
    }

    devices() {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM iotdevices";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    delete_device(deviceid) {
        return new Promise(
            (resolve, reject) => {
                deviceid = deviceid.toLowerCase();
                var query = "DELETE FROM iotdevices WHERE deviceid=? OR iotdevid=?";
                this.database.run(query, [deviceid, deviceid], (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            }
        );
    }

    get_device(deviceid) {
        return new Promise(
            (resolve, reject) => {
                deviceid = deviceid.toLowerCase();
                var query = "SELECT * FROM iotdevices WHERE deviceid=? OR iotdevid=?";
                this.database.get(query, [deviceid, deviceid], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(row);
                });
            }
        );        
    }


    add_device(deviceid, type, protocol, mcu, name, details, permission, features) {
        return new Promise(
            (resolve, reject) => {
                if (!deviceid || !type || !protocol || !mcu) {
                    return reject("Invalid device data add database add_device.");
                }

                deviceid = deviceid.toLowerCase();
                this.database.run(
                    "INSERT INTO iotdevices (deviceid, type, protocol, mcu, name, details, permission, features) VALUES (?,?,?,?,?,?,?,?)",
                    [deviceid, type, protocol, mcu, name, details, permission, features],
                    (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    }
                );
            }
        );        
    }

    update_device_permission(deviceid, permission) {
        return new Promise(
            (resolve, reject) => {
                if (!deviceid) {
                    return reject("Invalid device id.");
                }

                if (permission < 0 || permission > 2) {
                    return reject("Invalid permission.");
                }

                deviceid = deviceid.toLowerCase();
                var sql = "UPDATE iotdevices SET permission=" + permission + " WHERE deviceid='" + deviceid + "'";
                this.database.run(
                    sql,
                    [],
                    (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    }
                );
            }
        );
    }

    update_device(deviceid, name, permission) {
        return new Promise(
            (resolve, reject) => {
                if (!deviceid || !name ) {
                    return reject("Invalid device data add database add_device.");
                }

                deviceid = deviceid.toLowerCase();
                var sql = "UPDATE iotdevices SET name='" + name + "', permission=" + permission + " WHERE deviceid='" + deviceid + "'";
                this.database.run(
                    sql,
                    [],
                    (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    }
                );
            }
        );
    }

    get_device_blackilst() {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM iotdevices WHERE permission=2";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

}

module.exports = IoTDevicesDb;

