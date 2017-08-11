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

const db = require("libs/database").instance;

'use strict';

class ContactsDb {
    constructor() {
        this.m_database = 0;
    }

    get database() {
        if (!this.m_database) {
            this.m_database = db.sqldb;
        }
        return this.m_database;
    }

    getall(callback) {
        this.database.all(
            "SELECT * FROM contacts",
            [],
            (err, rows) => {
                if (err) {
                    return callback(err);
                }

                callback(null, rows);
            }
        );
    }

    data(contact_pkey, cb) {
        this.database.get(contact_pkey, function (err, data) {
            if (err) {
                if (err.type == "NotFoundError") {
                    //  not exists, not an error
                    cb(null);
                }
                else {
                    cb(err);
                }
            }
            else {
                var obj = 0;
                if (data) {
                    try {
                        obj = JSON.parse(data);
                    }
                    catch (e) {
                        obj = 0;
                    }
                }
                cb(null, obj);
            }
        });
    }

    put(contact_pkey, data, cb) {
        // must be string
        if (!(typeof contact_pkey === 'string') && !(data instanceof String)) {
            return cb("Invalid contact key. The contact key must be a string.");
        }

        if (!(typeof data === 'string') && !(data instanceof String)) {
            data = JSON.stringify(data);
        }

        this.database.put(contact_pkey, data, function (err) {
            cb(err);
        });
    }

}

module.exports = ContactsDb;