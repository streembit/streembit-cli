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


'use strict';

const bs58check = require('bs58check');
const createHash = require('create-hash');

const logger = require("streembit-util").logger;
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
        instance.m_users.set(value.pkhash, value);
    }

    list() {
        let list = [];
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

    get_user_bypkhash(pkhash) {
        return this.users.get(pkhash);
    }

    delete_user(userid) {
        var db = new Database();
        return db.delete_user(userid);
    }

    add_user(user) {
        const db = new Database();

        const buffer = new Buffer(user.publickey, 'hex');
        const rmd160buffer = createHash('rmd160').update(buffer).digest();
        const pkhash = bs58check.encode(rmd160buffer);

        return db.add_user(pkhash, user.publickey, user.username, user.isadmin, user.settings);
    }

    update_user(user) {
        const db = new Database();
        delete user.userid;
        return db.update_user(user.pkhash, user);
    }

    populate() {
        return new Promise((resolve, reject) => {
            var db = new Database();
            db.getall().then(
                rows => {
                    instance.m_users = new Map();
                    rows.forEach(function (item) {
                        instance.users = item;
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

    async syncusers(cnfusers) {
        try {
            if (!cnfusers || !cnfusers.length) {
                logger.info("NO user defined in the config file");
                return Promise.resolve();
            }

            var db = new Database();

            const dbusers = await db.getall();

            for (let i = 0; i < cnfusers.length; i++) {
                try {
                    let user = cnfusers[i];
                    let pkhash = user.pkhash;
                    let exists = false;
                    if (dbusers && dbusers.length) {
                        dbusers.forEach(
                            (dbitem) => {
                                if (dbitem.pkhash == pkhash) {
                                    exists = true;
                                }
                            }
                        );
                    }

                    if (!exists) {
                        let settings = user.settings ? JSON.stringify(user.settings) : null;

                        logger.debug("adding user " + user.pkhash + " to database ");

                        try {
                            await db.add_user(pkhash, user.publickey, user.username, user.isadmin, settings);
                        }
                        catch (err) {
                            return Promise.reject(new Error(err.message));
                        }
                    }
                    else {
                        logger.debug("user " + user.pkhash + " exist in database ");
                    }
                }
                catch (err) {
                    return Promise.reject(new Error(err.message));
                }
            }

            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(new Error(err.message));
        }
    }

    async init(callback) {

        try {
            await this.populate();
        }
        catch (err) {
            return callback("users populate error: " + err.message);
        }            

        var namesarr = [];
        this.users.forEach(
            (value, key) => {
                namesarr.push(value.username);
            }
        );

        var list = namesarr.length ? namesarr.join() : "-";
        logger.info("Users: " + list);

        callback();
    }

    validateUsername(username) {
        return /^[a-z0-9_-]{0,40}$/i.test(username);
    }

    validatePk(pk) {
        if (!pk || !pk.length) {
            return true;
        }
        return pk && /^[a-f0-9]{64,256}$/i.test(pk);
    }

    validate10(val) {
        var valid = /^[0-1]{0,1}$/.test(val);
        return valid;
    }

    validateJSON(json) {
        if (!json.length) {
            return true;
        }

        try {
            JSON.parse(json);
        } catch (e) {
            return false;
        }

        return true;
    }
}


module.exports = Users;
