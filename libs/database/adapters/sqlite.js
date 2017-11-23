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

const sqlite3 = require('sqlite3').verbose();
const config = require("libs/config");
const path = require('path');
const DbPath = require("./dbpath");
const logger = require("streembit-util").logger;

class Database {
    constructor() {
        this.db = null;
    }

    runsql(sql, callback) {
        this.db.run(sql, (err) => {
            callback(err);
        });
    }

    run(sql, params, callback) {
        this.db.run(sql, params, (err) => {
            callback(err);
        });
    }

    get(sql, params, callback) {
        this.db.get(sql, params, (err, row) => {
            callback(err, row);
        });
    }

    all(sql, params, callback) {
        this.db.get(sql, params, (err, rows) => {
            callback(err, rows);
        });
    }

    is_table_exists(tablename) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
                this.db.get(query, [tablename], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    var exists = row ? true : false;
                    resolve(exists);
                });
            }
        );
    }

    delete_if_exists(tablename) {
        return new Promise(
            (resolve, reject) => {
                logger.debug("delete DB table " + tablename + " if exists");
                var query = "DROP TABLE IF EXISTS " + tablename;
                this.db.get(query, [], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    var exists = row ? true : false;
                    resolve(exists);
                });
            }
        );
    }

    create_table(table) {
        return new Promise(
            (resolve, reject) => {
                try {
                    logger.debug("create DB table " + table.name);
                    let sql = "CREATE TABLE IF NOT EXISTS " + table.name + " (";
                    for (let i = 0; i < table.columns.length; i++) {
                        sql += " " + table.columns[i].name;
                        sql += " " + table.columns[i].datatype;
                        if (table.columns[i].pkey == true) {
                            sql += " PRIMARY KEY ASC";
                        }
                        if (table.columns[i].notnull == true) {
                            sql += " NOT NULL";
                        }
                        if (i < table.columns.length - 1) {
                            sql += ", ";
                        }
                        if (i == table.columns.length - 1) {
                            sql += ")";
                        }
                    }
                    this.db.run(sql, (err) => {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve();
                    });
                }
                catch (e) {
                    reject(e.message);
                }
            }
        );
    }

    create_index(index) {
        return new Promise(
            (resolve, reject) => {
                try {
                    logger.debug("create DB index " + index.name);
                    let sql = "CREATE";
                    if (index.unique == true) {
                        sql += " UNIQUE";
                    }
                    sql += " INDEX IF NOT EXISTS " + index.name + " ON " + index.table + " (" + index.column + ")";

                    this.db.run(sql, (err) => {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve();
                    });
                }
                catch (e) {
                    reject(e.message);
                }
            }
        );
    }

    async createdb(rootdir, type, dbname, tables, indexes) {
        // initialize SQLite database
        var dbpath = new DbPath();
        var db_path = dbpath.initialize_db_dir(rootdir, type, dbname);
        var dbname = dbname + ".db";
        var tmppath = path.join(db_path, dbname);
        var sqldb_file = path.normalize(tmppath);
        logger.debug("sql database file: " + sqldb_file);
        this.db = new sqlite3.Database(sqldb_file);
        logger.debug("sql database initialized");

        for (let i = 0; i < tables.length; i++) {
            try {
                if (tables[i].delete_if_exists == true) {
                    await this.delete_if_exists(tables[i].name);
                }
                else {
                    let exists = await this.is_table_exists(tables[i].name);
                    if (exists) {
                        continue;
                    }
                }
                await this.create_table(tables[i]);
            }
            catch (e) {
                return callback('create ' + tables[i].name + ' table error: ' + e.message);
            }
        }

        for (let i = 0; i < indexes.length; i++) {
            try {
                await this.create_index(indexes[i]);
            }
            catch (e) {
                return callback('create ' + indexes[i].name + ' index error: ' + e.message);
            }
        }  

        return this.db;
    }

    async create(rootdir, type, dbname, tables, indexes) {
        try {
            // initialize SQLite database
            var dbpath = new DbPath();
            var db_path = dbpath.initialize_db_dir(rootdir, type, dbname);
            var dbname = dbname + ".db";
            var tmppath = path.join(db_path, dbname);
            var sqldb_file = path.normalize(tmppath);
            logger.debug("sql database file: " + sqldb_file);
            this.db = new sqlite3.Database(sqldb_file);
            logger.debug("sql database initialized");

            for (let i = 0; i < tables.length; i++) {
                try {
                    if (tables[i].delete_if_exists == true) {
                        await this.delete_if_exists(tables[i].name);
                    }
                    else {
                        let exists = await this.is_table_exists(tables[i].name);
                        if (exists) {
                            continue;
                        }
                    }
                    await this.create_table(tables[i]);
                }
                catch (e) {
                    return callback('create ' + tables[i].name + ' table error: ' + e.message);
                }
            }

            for (let i = 0; i < indexes.length; i++) {
                try {
                    await this.create_index(indexes[i]);
                }
                catch (e) {
                    return callback('create ' + indexes[i].name + ' index error: ' + e.message);
                }
            }

            return Promise.resolve();

            //
        }
        catch (e) {
            return Promise.reject(new Error("sqlite DB create error: " + err.message));
        }   
    }

}


module.exports = Database;
