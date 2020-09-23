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

const database = require("libs/database/database");

'use strict';

class SeedlistDb extends database {
    constructor() {
        super();
    }

    setDB(db) {
        this.database = db;
    }

    /**
    * Add seed to DB
    * @param {string} identity. seed's identification key
    * @param {string} host. seed's ip address
    * @param {string} port. seed's port number
    * @returns {Promise}
    */
    addSeed(identity, host, port) {
        return new Promise(
            (resolve, reject) => {
                this.database.run(
                    "INSERT INTO seedlist(key, host, port) " +
                        "VALUES (?,?,?) ON CONFLICT(key) " +
                        "DO UPDATE SET lastConnection=current_timestamp",
                    [identity, host, port],
                    function(err) {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve();
                    });
            }
        );
    }

    /**
    * Get limited number of seeds sorted by last connection time from DB
    * @param {number} limit. how many seeds to get from DB
    * @returns {Promise}
    */
    getSeeds(limit) {
        limit = parseInt(limit);
        if (typeof limit !== 'number') {
            throw new Error('Limit in getSeeds funk must be a number')
        }

        return new Promise(
            (resolve, reject) => {
                this.database.all(
                    `SELECT key as id, host, port FROM seedlist ORDER BY lastConnection DESC LIMIT ${limit}`,
                    [],
                    function(err, rows) {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve(rows);
                    });
            }
        );
    }

    /**
    * Get a seed by key
    * @param {string} key. seed's identification key
    * @returns {Promise}
    */
    getByKey(key) {
        return new Promise(
            (resolve, reject) => {
                this.database.get(
                    "SELECT * FROM seedlist WHERE key = ?",
                    [key],
                    function(err, row) {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve(row);
                    });
            }
        );
    }

}

module.exports = SeedlistDb;
