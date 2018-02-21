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

class WhitelistDb extends database {
    constructor() {
        super();
    }

    get_rule(publickey) {
        return new Promise(
            (resolve, reject) => {
                const query = "SELECT * FROM whitelist WHERE publickey=?";
                this.database.get(query, [publickey], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(row);
                });
            }
        );
    }

    get_rules() {
        return new Promise(
            (resolve, reject) => {
                const query = "SELECT * FROM whitelist";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    add_rule(publickey, isactive) {
        return new Promise(
            (resolve, reject) => {
                try {
                    const query = "INSERT INTO whitelist(publickey, isactive, time_updated) VALUES (?,?,?)"
                    this.database.run(query, [publickey, isactive, +new Date], (err) => {
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

    delete_rule(val, byid = false) {
        return new Promise(
            (resolve, reject) => {
                const query = `DELETE FROM whitelist WHERE ${byid ? "wlid = ?" : "publickey = ?"}`;
                this.database.run(query, [val], err => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    flush() {
        return new Promise(
            (resolve, reject) => {
                const query = "DELETE FROM whitelist"
                this.database.run(query, [], err => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    update_active(publickey, isactive) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if (!pkhash || !token) {
                        throw new Error("invalid update_client parameters ad WS db.")
                    }

                    let query = "UPDATE whitelist SET isactive = ?, time_updated = ? WHERE publickey = ?";
                    this.database.run(query, [isactive, (+new Date), publickey], err => {
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

    update_byid(id, publickey, isactive) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if (!publickey || !isactive) {
                        throw new Error("invalid parameters.")
                    }

                    let query = "UPDATE whitelist SET publickey = ?, isactive = ?, time_updated = ? WHERE wlid = ?";
                    this.database.run(query, [publickey, isactive, +new Date, id], err => {
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
}

module.exports = WhitelistDb;