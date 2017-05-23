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

const db = require("libs/database");

'use strict';

class AccountsDb {
    constructor() {
        this.m_database = 0;
    }

    get database () {
        if (!this.m_database) {
            this.m_database = db.appdb;
        }
        return this.m_database;
    }

    data(cb) {
        this.database.get("account", function (err, data) {
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

    put(data, cb) {
        // must be string
        if ( !(typeof data === 'string') && !(data instanceof String)) {
            return cb("Invalid account data. The account data must be a string.");
        }

        this.database.put("account", data, function (err) {
            cb(err);
        });
    }

}

module.exports = AccountsDb;