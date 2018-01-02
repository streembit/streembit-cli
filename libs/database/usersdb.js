﻿/*
 
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

class UsersDb extends database{
    constructor() {
        super();
    }

    getall(callback) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM users";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

    get_user(pkhash) {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM users WHERE pkhash=?";
                this.database.get(query, [pkhash], (err, row) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(row);
                });
            }
        );
    }

    add_user(pkhash, publickey, username, isadmin, settings) {
        return new Promise(
            (resolve, reject) => {
                let sql = "INSERT INTO users(pkhash, publickey, username, isadmin, settings) VALUES (?,?,?,?,?)"
                this.database.run(sql, [pkhash, publickey, username, isadmin, settings], (err) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve();
                });
            }
        );
    }

    
    get_users() {
        return new Promise(
            (resolve, reject) => {
                var query = "SELECT * FROM users";
                this.database.all(query, [], (err, rows) => {
                    if (err) {
                        return reject(err.message);
                    }
                    resolve(rows);
                });
            }
        );
    }

}

module.exports = UsersDb;