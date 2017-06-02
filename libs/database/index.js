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

var streembit = streembit || {};

var fs = require('fs');
var path = require('path');
var log = require("libs/logger");
var levelup = require('levelup');

streembit.database = (function (db, logger) {

    var _streembitdb = null;
    var _appdb = null;
    var _blockchaindb = null;
    var _contactsdb = null;

    function initialize_db_rootpath(dirname) {

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

    function initialize_db_dir(dbname, dirname) {
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

    Object.defineProperty(db, "streembitdb", {
        get: function () {
            return _streembitdb;
        },

        set: function (value) {
            _streembitdb = value;
        }
    });

    Object.defineProperty(db, "appdb", {
        get: function () {
            return _appdb;
        },

        set: function (value) {
            _appdb = value;
        }
    });

    Object.defineProperty(db, "blockchaindb", {
        get: function () {
            return _blockchaindb;
        },

        set: function (value) {
            _blockchaindb = value;
        }
    });

    Object.defineProperty(db, "contactsdb", {
        get: function () {
            return _contactsdb;
        },

        set: function (value) {
            _contactsdb = value;
        }
    });

    db.init_databases = function (dirname, callback) {
        try {
            initialize_db_rootpath(dirname);

            initialize_db_dir('streembitdb', dirname);
            var maindb_path = path.join(dirname, 'db', 'streembitdb');
            var main_dbobj = levelup(maindb_path);
            db.streembitdb = main_dbobj;
            logger.debug("streembitdb database initialized");

            initialize_db_dir('appdb', dirname);
            var appdb_path = path.join(dirname, 'db', 'appdb');
            var app_dbobj = levelup(appdb_path);
            db.appdb = app_dbobj;
            logger.debug("appdb database initialized");

            initialize_db_dir('contactsdb', dirname);
            var contactsdb_path = path.join(dirname, 'db', 'contactsdb');
            var contacts_dbobj = levelup(contactsdb_path);
            db.contactsdb = contacts_dbobj;
            logger.debug("contactsdb database initialized");

            initialize_db_dir('blockchaindb', dirname);
            var bcdb_path = path.join(dirname, 'db', 'blockchaindb');
            var bc_dbobj = levelup(bcdb_path);
            db.blockchaindb = bc_dbobj;
            logger.debug("blockchaindb database initialized");

            callback();
        }
        catch (e) {
            callback(e.message);
        }
    };

    return db;

}(streembit.database || {}, log));


module.exports = streembit.database;




