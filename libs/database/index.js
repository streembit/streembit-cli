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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const fs = require('fs');
const path = require('path');
const logger = require("libs/logger");
const levelup = require('levelup');
const sqlite3 = require('sqlite3').verbose();
const config = require("libs/config");
const util = require('util');

const singleton = Symbol();
const singleton_verifier = Symbol()

class Database {
    constructor(verifier) {
        if (verifier != singleton_verifier) {
            throw "Constructing Database singleton is not allowed";
        }

        this.m_streembitdb = 0;
        this.m_sqldb = 0;
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new Database(singleton_verifier);
        }
        return this[singleton];
    }

    get streembitdb() {
        return this.m_streembitdb;
    }

    set streembitdb(value) {
        this.m_streembitdb = value;
    }

    get sqldb() {
        return this.m_sqldb;
    }

    set sqldb(value) {
        this.m_sqldb = value;
    }

    initialize_db_rootpath(dirname) {

        if (!dirname) {
            throw new Error("the directory for databases is invalid");
        }

        var dbdir_path = path.join(dirname, 'db');
        var exists = fs.existsSync(dbdir_path);
        if (exists) {
            logger.debug("DB directory exists");   
            return;
        }

        /* the DB directory doesn't exist */
        logger.info("Creating " + dirname + " database directory ...");        
        try {
            fs.mkdirSync(dbdir_path);
        }
        catch (e) {
            if (e.message.indexOf("EEXIST") < 0) {
                throw new Error("creating " + dbname + " database error: " + e.message);
            }
        }
    }

    initialize_db_dir(dbname, dirname) {
        // create the db directory
        var db_path = path.join(dirname, 'db', dbname);
        var exists = fs.existsSync(db_path);
        if (exists) {
            return;
        }

        try {
            logger.info("creating database, path: %s", db_path);
            fs.mkdirSync(db_path);
        }
        catch (e) {
            throw new Error("creating " + dbname + " database error: " + e.message);
        }

        exists = fs.existsSync(db_path);
        if (!exists) {
            throw new Error("Unable to create " + dbname + " data directory");
        }
        else {
            logger.info(dbname + " database directory created");
        }
    }

    is_table_exists(tablename) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
                this.sqldb.get(query, [tablename], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    var exists = row ? true : false;
                    resolve(exists);
                });               
            }
        );        
    }

    get_users() {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM users";
                this.sqldb.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    create_table(sql) {
        return new Promise(
            (resolve, reject) => {
                this.sqldb.run(sql, (err) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    add_user(pkhash, publickey, username, isadmin, settings) {
        return new Promise(
            (resolve, reject) => {
                let sql = "INSERT INTO users(pkhash, publickey, username, isadmin, settings) VALUES (?,?,?,?,?)"
                this.sqldb.run(sql, [pkhash, publickey, username, isadmin, settings], (err) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    get_devices() {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM iotdevices";
                this.sqldb.all(query, [], (err, rows) => {
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
                this.sqldb.get(query, [deviceid], (err, row) => {
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
                this.sqldb.all(query, [protocol], (err, rows) => {
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
                this.sqldb.all(query, [devrowid], (err, rows) => {
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
                this.sqldb.all(query, [deviceid], (err, rows) => {
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

                this.sqldb.run(
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

    add_feature(deviceid, type, clusters, setting) {
        return new Promise(
            (resolve, reject) => {
                if (!deviceid || !type) {
                    return reject("Invalid feaure data add database add_feature.");
                }

                this.sqldb.run(
                    "INSERT INTO iotfeatures (devrowid, type, clusters, settings) VALUES (?,?,?,?)",
                    [deviceid, type, clusters, setting],
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

    async create_users(cnfusers, dbusers) {   
        try {
            console.log("creating users in the database");
            //console.log("cnfusers " + util.inspect(cnfusers));

            if (!cnfusers || !cnfusers.length) {
                return Promise.resolve();
            }

            //console.log("dbusers " + util.inspect(dbusers));

            for (let i = 0; i < cnfusers.length; i++) {
                try {
                    let user = cnfusers[i];
                    let pkhash = user.pkhash;
                    let exists = false;
                    if (dbusers && dbusers.length) {
                        dbusers.forEach(
                            (dbitem) => {
                                if (dbitem.pkhash == pkhash) {
                                    exists = true;
                                }
                            }
                        );
                    }

                    if (!exists) {
                        let settings = user.settings ? JSON.stringify(user.settings) : null;
                        console.log("adding user " + user.pkhash + " to database ");
                        try {
                            await this.add_user(pkhash, user.publickey, user.username, user.isadmin, settings);
                        }
                        catch (err) {
                            return Promise.reject(new Error(err.message));
                        }
                    }
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

    async device_to_db(device) {

        function feature_indb(dbfeatures, conf) {
            if (!dbfeatures) {
                return false;
            }

            var exists = false;
            dbfeatures.forEach(
                (item) => {
                    if (conf.type == item.type) {
                        exists = true;
                    }
                }
            );
            return exists;
        }

        try {
            let dbrow = await this.get_device(device.id);
            if (!dbrow) {
                // add to database
                let deviceid = device.id,
                    type = device.type,
                    protocol = device.protocol,
                    mcu = device.mcu,
                    details = device.details ? JSON.stringify(device.details) : null;
                await this.add_device(deviceid, type, protocol, mcu, details);
                dbrow = await this.get_device(device.id);
            }

            // get all features
            let conf_features = device.features;
            if (conf_features) {
                let devrowid = dbrow.devrowid;
                let features = await this.get_features_by_devicerowid(devrowid);
                for (let i = 0; i < conf_features.length; i++) {
                    var isadded = feature_indb(features, conf_features[i]);
                    if (!isadded) {
                        let type = conf_features[i].type,
                            clusters = conf_features[i].clusters ? JSON.stringify(conf_features[i].clusters) : null,
                            settings = conf_features[i].settings ? JSON.stringify(conf_features[i].settings) : null;
                        await this.add_feature(devrowid, type, clusters, settings);
                        console.log("feature added to DB: " + util.inspect(conf_features[i]));
                    }
                }
            }
        }
        catch (err) {
            logger.error("Device to DB error: " + err.message);
        }
    }

    async create_devices() {
        try {
            console.log("creating IoT devices in the database");
            var conf = config.iot_config;
            var devices = conf.devices;
            for (let i = 0; i < devices.length; i++) {
                try {
                    await this.device_to_db(devices[i]);
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

    async init(dirname, callback) {
        try {
            // make sure the database root directory exists
            this.initialize_db_rootpath(dirname);

            // initialize the leveldb database
            this.initialize_db_dir('streembitdb', dirname);
            var maindb_path = path.join(dirname, 'db', 'streembitdb');
            var main_dbobj = levelup(maindb_path);
            this.streembitdb = main_dbobj;
            logger.debug("streembitdb database initialized");

            // initialize SQLite database
            this.initialize_db_dir('sqldb', dirname);
            var sqldb_path = path.join(dirname, 'db', 'sqldb');
            var sqldb_file = sqldb_path + "/streembit.db";
            logger.debug("sql database file: " + sqldb_file);
            this.sqldb = new sqlite3.Database(sqldb_file);
            logger.debug("sql database initialized");
            
            try {
                let exists = await this.is_table_exists("accounts");
                if (!exists) {
                    let accounts_table = "CREATE TABLE IF NOT EXISTS accounts ( \
                        accountid integer PRIMARY KEY, \
                        account text NOT NULL, \
                        accountpk text NOT NULL, \
                        cipher text NOT NULL)";
                    await this.create_table(accounts_table);
                }
            }
            catch (e) {
                return callback('create accounts table error: ' + e.message);
            }

            try {
                let exists = await this.is_table_exists("contacts");
                if (!exists) {
                    let contacts_table = "CREATE TABLE IF NOT EXISTS contacts ( \
                        contactid integer PRIMARY KEY, \
                        pkhash text NOT NULL, \
                        publickey text NOT NULL, \
                        username text )";
                    await this.create_table(contacts_table);
                }
            }
            catch (e) {
                return callback('create contacts table error: ' + e.message);
            }

            try {
                let exists = await this.is_table_exists("users");
                if (!exists) {
                    let users_table = "CREATE TABLE IF NOT EXISTS users ( \
                        userid integer PRIMARY KEY, \
                        pkhash text NOT NULL, \
                        publickey text NOT NULL, \
                        isadmin integer NOT NULL DEFAULT 0, \
                        username text, \
                        settings text)";
                    await this.create_table(users_table);
                }
            }
            catch (e) {
                return callback('create users table error: ' + e.message);
            }

            try {
                let exists = await this.is_table_exists("iotdevices");
                if (!exists) {
                    let iotdevices_table = "CREATE TABLE IF NOT EXISTS iotdevices ( \
                        devrowid integer PRIMARY KEY, \
                        deviceid text NOT NULL, \
                        type integer NOT NULL, \
                        protocol text NOT NULL, \
                        mcu text NOT NULL, \
                        details text )";
                    await this.create_table(iotdevices_table);
                }
            }
            catch (e) {
                return callback('create iotdevices table error: ' + e.message);
            }          

            try {
                let exists = await this.is_table_exists("iotfeatures");
                if (!exists) {
                    let iotfeatures_table = "CREATE TABLE IF NOT EXISTS iotfeatures ( \
                    featureid integer PRIMARY KEY, \
                    devrowid integer NOT NULL, \
                    type integer NOT NULL, \
                    clusters text, \
                    settings text, \
                    FOREIGN KEY (devrowid) REFERENCES iotdevices (devrowid) )";
                    await this.create_table(iotfeatures_table);
                }
            }
            catch (e) {
                return callback('create iotfeatures table error: ' + e.message);
            }          

            try {
                let get_iotfeatures_view = "CREATE VIEW IF NOT EXISTS vw_get_features AS \
                    SELECT dev.deviceid, ft.devrowid, ft.featureid, ft.type, ft.clusters, ft.settings \
                    FROM iotfeatures ft INNER JOIN iotdevices dev ON ft.devrowid = dev.devrowid;";
                await this.create_table(get_iotfeatures_view);
            }
            catch (e) {
                return callback('create iotfeatures table error: ' + e.message);
            }  

            // make sure the users table is populated           
            try {
                var cnfusers = config.users;
                const dbusers = await this.get_users();                
                await this.create_users(cnfusers, dbusers);
            }
            catch (e) {
                return callback('create users table error: ' + e.message);
            }  


            // make sure the devices data is populated           
            try {
                await this.create_devices();
            }
            catch (e) {
                return callback('create devices database error: ' + e.message);
            }  

            
            callback();
            //
        }
        catch (e) {
            callback(e.message);
        }        
    }
}

module.exports = Database;




