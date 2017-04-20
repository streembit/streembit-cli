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

    function initialize_streembitdb_dir (dirname) {
        // create the db directory
        var maindb_path = path.join(dirname, 'db', 'streembitdb');
        logger.info("initializing database, maindb_path: %s", maindb_path);
        var exists = fs.existsSync(maindb_path);
        if (exists) {
            return;
        }

        /* the DB directory doesn't exist */
        logger.info("Creating database directory ...");
        var dbdir_path = path.join(__dirname, 'db');
        try {
            fs.mkdirSync(dbdir_path);
        }
        catch (e) {
            if (e.message.indexOf("EEXIST") < 0) {
                throw new Error("creating database error: " + e.message);
            }
        }

        try {
            fs.mkdirSync(maindb_path);
        }
        catch (e) {
            throw new Error("creating database error: " + e.message);
        }

        exists = fs.existsSync(maindb_path);
        if (!exists) {
            throw new Error("Unable to create data directory");
        }
        else {
            logger.info("streembitdb database directory created");
            callback();
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

    db.init_streembitdb = function (dirname, callback) {
        try {
            initialize_streembitdb_dir(dirname);

            var maindb_path = path.join(dirname, 'db', 'streembitdb');
            var dbobj = levelup(maindb_path);
            db.streembitdb = dbobj;

            logger.debug("streembitdb database created");

            callback();
        }
        catch (err) {
            return callback(err.message)
        }
    };

    db.init_appdb = function (dirname, callback) {
        try {
            initialize_streembitdb_dir(dirname);

            var maindb_path = path.join(dirname, 'db', 'appdb');
            var dbobj = levelup(maindb_path);
            db.streembitdb = dbobj;

            logger.debug("appdb database created");

            callback();
        }
        catch (err) {
            return callback(err.message)
        }
    };

    db.init_blockchaindb = function (dirname, callback) {
        try {
            initialize_streembitdb_dir(dirname);

            var maindb_path = path.join(dirname, 'db', 'blockchaindb');
            var dbobj = levelup(maindb_path);
            db.streembitdb = dbobj;

            logger.debug("blockchaindb database created");

            callback();
        }
        catch (err) {
            return callback(err.message)
        }
    };

    return db;
}(streembit.database || {}, log));


module.exports = streembit.database;




