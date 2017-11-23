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
const logger = require("streembit-util").logger;

class DbPath {
    constructor(verifier) {
    }

    initialize_db_rootpath(rootdir) {
        var dbdir_path = path.join(rootdir, 'db');
        var exists = fs.existsSync(dbdir_path);
        if (exists) {
            logger.debug(dbdir_path + " DB directory exists");
            return;
        }

        /* the DB directory doesn't exist */
        logger.info("Creating " + dbdir_path + " database directory ...");
        try {
            fs.mkdirSync(dbdir_path);
        }
        catch (e) {
            if (e.message.indexOf("EEXIST") < 0) {
                throw new Error("creating root dir database error: " + e.message);
            }
        }
    }

    initialize_db_typepath(rootdir, type) {
        var dbdir_path = path.join(rootdir, 'db', type);
        var exists = fs.existsSync(dbdir_path);
        if (exists) {
            logger.debug(dbdir_path + " DB directory exists");
            return;
        }

        /* the DB directory doesn't exist */
        logger.info("Creating " + dbdir_path + " database directory ...");
        try {
            fs.mkdirSync(dbdir_path);
        }
        catch (e) {
            if (e.message.indexOf("EEXIST") < 0) {
                throw new Error("creating db type dir database error: " + e.message);
            }
        }
    }

    initialize_db_dir(rootdir, type, dbname) {
        // make sure the database root directory exists
        this.initialize_db_rootpath(rootdir);
        this.initialize_db_typepath(rootdir, type);

        // create the db directory
        var db_path = path.join(rootdir, 'db', type, dbname);
        var exists = fs.existsSync(db_path);
        if (exists) {
            return db_path;
        }

        try {
            logger.info("creating database, path: %s", db_path);
            fs.mkdirSync(db_path);
        }
        catch (e) {
            throw new Error("creating " + type + " " + dbname + " database error: " + e.message);
        }

        exists = fs.existsSync(db_path);
        if (!exists) {
            throw new Error("Unable to create" + type + " " + dbname + " data directory");
        }
        else {
            logger.debug( type + " " + dbname + " database directory exists");
        }

        return db_path;
    }
}

module.exports = DbPath;
