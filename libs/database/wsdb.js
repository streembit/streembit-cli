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
                const sql = "INSERT INTO wsclients(pkhash, publickey, token, isactive, account, time_updated) VALUES (?,?,?,?,?,?)"
                this.database.run(sql, [pkhash, publickey, token, isactive, account, (+new Date)], (err) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
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

    delete_client(clientid) {
        return new Promise(
            (resolve, reject) => {
                const sql = "DELETE FROM wsclients WHERE clientid=?"
                this.database.run(sql, [clientid], (err) => {
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