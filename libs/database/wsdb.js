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
Author: Streembit team
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

const database = require("libs/database/database");

'use strict';

class WsDb extends database {
    constructor() {
        super();
    }

    getall(callback) {
        return new Promise(
            (resolve, reject) => {
                const query = "SELECT * FROM wsclients";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    get_client(pkhash) {
        return new Promise(
            (resolve, reject) => {
                const query = "SELECT * FROM wsclients WHERE pkhash=?";
                this.database.get(query, [pkhash], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(row);
                });
            }
        );
    }

    add_client(pkhash, publickey, token, isactive, account) {
        return new Promise(
            (resolve, reject) => {
                const query = "INSERT INTO wsclients(pkhash, publickey, token, isactive, account, time_updated) VALUES (?,?,?,?,?,?)"
                this.database.run(query, [pkhash, publickey, token, isactive, account, (+new Date)], (err) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    update_client(pkhash, params) {
        return new Promise(
            (resolve, reject) => {
                const para_keys = Object.keys(params);
                const para_vals = Object.values(params);
                if (!params || para_keys.length < 1) {
                    return reject("No update parameters specified");
                }
                let query = "UPDATE wsclients SET " +para_keys.join(' = ?, ')+ " = ?, time_updated = ? WHERE pkhash = ?";
                para_vals.push((+new Date), pkhash);
                this.database.run(query, para_vals, err => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                })
            }
        );
    }

    get_clients() {
        return new Promise(
            (resolve, reject) => {
                const query = "SELECT * FROM wsclients";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    /*
    * Get WS clients count from DB
    * applying options parameters and grouping
    * @function
    * @param {Object} params: parameters to filter
    * @param {Array} groupby: parameters to group counts
    * @returns {Promise}
    */
    get_clients_count(params = null, groupby = null) {
        return new Promise(
            (resolve, reject) => {
                let query = "SELECT COUNT(*) as total FROM wsclients";
                let params_q = [];
                if (params) {
                    query += " WHERE " +Object.keys(params).join(' = ? AND ')+ " = ?";
                    params_q = Object.values(params);
                }
                if (groupby) {
                    query += " GROUP BY " +groupby.join(', ');
                    query = query.replace(/SELECT COUNT/, `SELECT ${groupby.join(', ')}, COUNT`);
                }
                this.database.all(query, params_q, (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(row ? row[0] : { total: 0 });
                })
            }
        );
    }

    delete_client(clientid) {
        return new Promise(
            (resolve, reject) => {
                const query = "DELETE FROM wsclients WHERE clientid=?"
                this.database.run(query, [clientid], (err) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

}

module.exports = WsDb;