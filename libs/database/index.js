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

//var database = (function(db, logger) {

//    var _streembitdb = null;
//    var _appdb = null;
//    var _blockchaindb = null;
//    var _contactsdb = null;

//    function initialize_db_rootpath(dirname) {

//        if (!dirname) {
//            throw new Error("the directory for databases is invalid");
//        }

//        var dbdir_path = path.join(dirname, 'db');
//        var exists = fs.existsSync(dbdir_path);
//        if (exists) {
//            logger.debug("DB directory exists");   
//            return;
//        }

//        /* the DB directory doesn't exist */
//        logger.info("Creating " + dirname + " database directory ...");        
//        try {
//            fs.mkdirSync(dbdir_path);
//        }
//        catch (e) {
//            if (e.message.indexOf("EEXIST") < 0) {
//                throw new Error("creating " + dbname + " database error: " + e.message);
//            }
//        }
//    }

//    function initialize_db_dir(dbname, dirname) {
//        // create the db directory
//        var db_path = path.join(dirname, 'db', dbname);
//        var exists = fs.existsSync(db_path);
//        if (exists) {
//            return;
//        }

//        try {
//            logger.info("creating database, path: %s", db_path);
//            fs.mkdirSync(db_path);
//        }
//        catch (e) {
//            throw new Error("creating " + dbname + " database error: " + e.message);
//        }

//        exists = fs.existsSync(db_path);
//        if (!exists) {
//            throw new Error("Unable to create " + dbname + " data directory");
//        }
//        else {
//            logger.info(dbname + " database directory created");
//        }
//    }

//    Object.defineProperty(db, "streembitdb", {
//        get: function () {
//            return _streembitdb;
//        },

//        set: function (value) {
//            _streembitdb = value;
//        }
//    });

//    Object.defineProperty(db, "appdb", {
//        get: function () {
//            return _appdb;
//        },

//        set: function (value) {
//            _appdb = value;
//        }
//    });

//    Object.defineProperty(db, "blockchaindb", {
//        get: function () {
//            return _blockchaindb;
//        },

//        set: function (value) {
//            _blockchaindb = value;
//        }
//    });

//    Object.defineProperty(db, "contactsdb", {
//        get: function () {
//            return _contactsdb;
//        },

//        set: function (value) {
//            _contactsdb = value;
//        }
//    });

//    db.init_databases = function (dirname, callback) {
//        try {
//            initialize_db_rootpath(dirname);

//            initialize_db_dir('streembitdb', dirname);
//            var maindb_path = path.join(dirname, 'db', 'streembitdb');
//            var main_dbobj = levelup(maindb_path);
//            db.streembitdb = main_dbobj;
//            logger.debug("streembitdb database initialized");

//            initialize_db_dir('appdb', dirname);
//            var appdb_path = path.join(dirname, 'db', 'appdb');
//            var app_dbobj = levelup(appdb_path);
//            db.appdb = app_dbobj;
//            logger.debug("appdb database initialized");

//            initialize_db_dir('contactsdb', dirname);
//            var contactsdb_path = path.join(dirname, 'db', 'contactsdb');
//            var contacts_dbobj = levelup(contactsdb_path);
//            db.contactsdb = contacts_dbobj;
//            logger.debug("contactsdb database initialized");

//            initialize_db_dir('blockchaindb', dirname);
//            var bcdb_path = path.join(dirname, 'db', 'blockchaindb');
//            var bc_dbobj = levelup(bcdb_path);
//            db.blockchaindb = bc_dbobj;
//            logger.debug("blockchaindb database initialized");

//            callback();
//        }
//        catch (e) {
//            callback(e.message);
//        }
//    };

//    return db;

//}({}, log));

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
                return callback('create accounts table error: ' + err.message);
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
                return callback('create contacts table error: ' + err.message);
            }

            try {
                let exists = await this.is_table_exists("users");
                if (!exists) {
                    let users_table = "CREATE TABLE IF NOT EXISTS users ( \
                        userid integer PRIMARY KEY, \
                        pkhash text NOT NULL, \
                        publickey text NOT NULL, \
                        isadmin integer NOT NULL DEFAULT 0, \
                        username text )";
                    await this.create_table(users_table);
                }
            }
            catch (e) {
                return callback('create users table error: ' + err.message);
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
                return callback('create iotdevices table error: ' + err.message);
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
                return callback('create iotfeatures table error: ' + err.message);
            }          

            try {
                let get_iotfeatures_view = "CREATE VIEW IF NOT EXISTS vw_get_features AS \
                    SELECT dev.deviceid, ft.devrowid, ft.featureid, ft.type, ft.clusters, ft.settings \
                    FROM iotfeatures ft INNER JOIN iotdevices dev ON ft.devrowid = dev.devrowid;";
                await this.create_table(get_iotfeatures_view);
            }
            catch (e) {
                return callback('create iotfeatures table error: ' + err.message);
            }          

            callback();
            //
        }
        catch (e) {
            reject(e.message);
        }        
    }
}

module.exports = Database;




