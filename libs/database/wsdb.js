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
                try {
                    const query = "INSERT INTO wsclients(pkhash, publickey, token, isactive, account, time_updated) VALUES (?,?,?,?,?,?)"
                    this.database.run(query, [pkhash, publickey, token, isactive, account, (+new Date)], (err) => {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve();
                    });
                }
                catch (err) {
                    reject(err.message);
                }
            }
        );
    }

    update_client(pkhash, token, isactive) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if (!pkhash || !token) {
                        throw new Error("invalid update_client parameters ad WS db.")
                    }

                    let query = "UPDATE wsclients SET token = ?, isactive = ?, time_updated = ? WHERE pkhash = ?";
                    this.database.run(query, [token, isactive, (+new Date), pkhash], err => {
                        if (err) {
                            return reject(err.message);
                        }
                        resolve();
                    })
                }
                catch (err) {
                    reject(err.message);
                }
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

    get_activeclients_count() {
        return new Promise(
            (resolve, reject) => {
                let query = "SELECT COUNT(clientid) as total FROM wsclients WHERE isactive = 1;";
                this.database.all(query, [], (err, row) => {
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
                this.database.run(query, [clientid], err => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    delete_all_clients() {
        return new Promise(
            (resolve, reject) => {
                const query = "DELETE FROM wsclients"
                this.database.run(query, [], err => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    async register(pkhash, publickey, token, account) {
        if (!pkhash  || !publickey || !token || !account) {
            return Promise.reject(new Error("invalid parameter at wsdb register"));
        }

        try {
            const client = await this.get_client(pkhash);
            try {
                if (!client) {
                    await this.add_client(pkhash, publickey, token, 1, account);
                } else {
                    await this.update_client(pkhash, token, 1);
                }
            } catch (err) {
                return Promise.reject(new Error(err.message));
            }

            return Promise.resolve();
        }
        catch (err) {
            console.log('ERROR:', err);
            return Promise.reject(new Error(typeof err === 'string' ? err : err.message));
        }
    }

}

module.exports = WsDb;