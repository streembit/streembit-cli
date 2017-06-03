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


var logger = require("libs/logger");
var async = require("async");
var config = require("libs/config");
const Database = require("libs/database/contactsdb");

let instance = null;

class Contacts {

    constructor() {
        if (!instance) {
            instance = this;
            this.m_contacts = new Map();
        }

        return instance;
    }

    get contacts() {
        return this.m_contacts;
    }

    set contacts(v) {
        this.m_contacts = v;
    }

    init_from_config() {
        return new Promise((resolve, reject) => {
            // get the set of contacts from the config file
            var contacts = config.client_config.contacts;
            if (!contacts || !Array.isArray(contacts) || contacts.length == 0) {
                logger.warn("There are no contacts in the config file. In client mode normally at least one contact should exist to communicate with someone"); 
                return resolve();
            }

            var db = new Database();

            async.each(contacts, function (contact, callback) {
                var key = contact.pkey;
                var data = {
                    isadmin: contact.isadmin,
                    account: contact.account
                };
                db.put(key, data, (err) => {
                    callback(err);
                });                
            },
            function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }

    list() {
        var list = [];
        this.contacts.forEach(function (value, key) {
            var v = JSON.parse(value);
            v.public_key = key;
            list.push(v);
        });
        return list;
    }

    init_from_db() {
        return new Promise((resolve, reject) => {
            var db = new Database();
            db.getall((err, coll) => {
                if (err) {
                    return reject(err);
                }

                coll.forEach(function (item) {
                    instance.contacts.set(item.key, item.value);
                });

                resolve();
            });
            
        });
    }

    init(callback) {
        try {           
            this.init_from_config()
                .then(this.init_from_db)
                .then(() => {
                    logger.debug("contacts initialized, total contacts: " + this.contacts.size);    
                    callback()
                })
                .catch((err) => callback(err));
        }
        catch (err) {
            callback("contacts init error: " + err.message);
        }
    }
}


module.exports = Contacts;




