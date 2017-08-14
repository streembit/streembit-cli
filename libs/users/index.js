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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const logger = require("libs/logger");
const async = require("async");
const config = require("libs/config");
const Database = require("libs/database/usersdb");

let instance = null;

class Users {

    constructor() {
        if (!instance) {
            instance = this;
            instance.m_users = new Map();
        }

        return instance;
    }

    get users() {
        return instance.m_users;
    }

    set users(value) {
        instance.m_users = value;
    }

    list() {
        var list = [];
        this.users.forEach(
            (item, key) => {
                list.push(item);
            }
        );
        return list;
    }

    get_user_bypublickey(publickey) {
        var user;
        this.users.forEach(
            (item, key) => {
                if (item.publickey == publickey) {
                    user = item;
                }
            }
        );
        return user;
    }

    init_from_db() {
        return new Promise((resolve, reject) => {
            var db = new Database();
            db.getall().then(
                (rows) => {
                    rows.forEach(function (item) {
                        instance.users.set(item.pkhash, item);
                    });
                    resolve();
                })
                .catch(
                    (err) => {
                        reject(err);
                    }
                );            
        });
    }

    init(callback) {
        try {           
            this.init_from_db()
                .then(() => {
                    logger.debug("users initialized, total users: " + this.users.size);    
                    callback()
                })
                .catch((err) => callback(err));
        }
        catch (err) {
            callback("users init error: " + err.message);
        }
    }
}


module.exports = Users;




