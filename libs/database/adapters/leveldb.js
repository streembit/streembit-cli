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

const levelup = require('levelup');
const config = require("libs/config");
const path = require('path');
const DbPath = require("./dbpath");
const logger = require("libs/logger");

class Database {
    constructor() {
        this.db = null;
    }

    async createdb(rootdir, type, dbname) {
        // initialize leveldb database
        var dbpath = new DbPath();
        var db_path = dbpath.initialize_db_dir(rootdir, type, dbname);
        var main_dbobj = levelup(db_path);
        this.db = main_dbobj;
        logger.debug("leveldb " + dbname + " database initialized");

        return this.db;
    }

    async create(rootdir, type, dbname) {
        return new Promise(
            (resolve, reject) => {
                try {
                    // initialize leveldb database
                    var dbpath = new DbPath();
                    var db_path = dbpath.initialize_db_dir(rootdir, type, dbname);
                    var main_dbobj = levelup(db_path);
                    this.db = main_dbobj;
                    logger.debug("leveldb " + dbname + " database initialized");
                    resolve();
                }
                catch (e) {
                    reject("leveldb create error: " + e.message);
                }
            }
        );
    }
}


module.exports = Database;
