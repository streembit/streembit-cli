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
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

const database = require("libs/database/database");

'use strict';

class AccountsDb extends database{
    constructor() {
        super();
    }

    data(account, cbfn) {
        this.database.get(
            "SELECT * FROM accounts WHERE account=?",
            [account],
            function (err, row) {
                cbfn(err, row);            
            }
        );
    }

    add(account, accountpk, cipher, cb) {
        if (!account) {
            return cb("Invalid account data.");
        }
        if (!accountpk) {
            return cb("Invalid account accountpk data.");
        }
        // cipher must be string
        if (!(typeof cipher === 'string') && !(cipher instanceof String)) {
            return cb("Invalid account cipher data. The account cipher data must be a string.");
        }

        this.database.run(
            "INSERT INTO accounts (account,accountpk,cipher) VALUES (?,?,?)",
            [account, accountpk, cipher],
            (err) => {
                if (err) {
                    return cb(err);
                }

                cb();
            }
        );
    }

}

module.exports = AccountsDb;