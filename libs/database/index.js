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

const util = require('util');
const dbschema = require('./schema.json');
const logger = require("libs/logger");

const singleton = Symbol();
const singleton_verifier = Symbol()

class Database {
    constructor(verifier) {
        if (verifier != singleton_verifier) {
            throw "Constructing Database singleton is not allowed";
        }

        this.databases = {};
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new Database(singleton_verifier);
        }
        return this[singleton];
    } 
    
    async init(rootdir, callback) {
        try {
            if (!dbschema || !Array.isArray(dbschema)) {
                throw new Error("invalid database schema config file");
            }

            for (let i = 0; i < dbschema.length; i++) {
                let database = dbschema[i];
                let type = database.type;
                let DbLib = require("libs/database/adapters/" + type);
                let dblib = new DbLib();
                await dblib.create(rootdir, type, database.name, database.tables, database.indexes);
                this.databases[database.key] = dblib.db;
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




