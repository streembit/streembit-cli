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

const dbinstance = require("libs/database").instance;

class IoTDevicesDb {
    constructor() {
        this.m_database = 0;
    }

    get database () {
        if (!this.m_database) {
            this.m_database = dbinstance.sqldb;
        }
        return this.m_database;
    }

    get_devices() {
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

    get_device(deviceid) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM iotdevices WHERE deviceid=?";
                this.database.get(query, [deviceid], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(row);
                });
            }
        );        
    }

    get_devices_by_protocol(protocol) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM iotdevices WHERE protocol=?";
                this.database.all(query, [protocol], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    get_features_by_devicerowid(devrowid) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM iotfeatures WHERE devrowid=?";
                this.database.all(query, [devrowid], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    get_features_by_deviceid(deviceid) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM vw_get_features WHERE deviceid=?";
                this.database.all(query, [deviceid], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    add_device(deviceid, type, protocol, mcu, details) {
        return new Promise(
            (resolve, reject) => {
                if (!deviceid || !type || !protocol || !mcu) {
                    return reject("Invalid device data add database add_device.");
                }

                this.database.run(
                    "INSERT INTO iotdevices (deviceid, type, protocol, mcu, details) VALUES (?,?,?,?,?)",
                    [deviceid, type, protocol, mcu, details],
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

    add_feature(deviceid, type, cluster, setting) {
        return new Promise(
            (resolve, reject) => {
                if (!deviceid || !type ) {
                    return reject("Invalid feaure data add database add_feature.");
                }

                this.database.run(
                    "INSERT INTO iotfeatures (devrowid, type, cluster, settings) VALUES (?,?,?,?)",
                    [deviceid, type, cluster, setting],
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

    get_features() {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM vw_get_features";
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

