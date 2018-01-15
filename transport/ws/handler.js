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

'use strict';

class WsHandler{
    constructor() {
        this.list_of_sessions = new Map();
    }

    // event handler to send messages back to the client
    on_send() {
    }

    // handles messages from the client
    processmsg(ws, request) {
    }

    format_error(txn, err) {
        var errobj = { txn: txn, error: "" };
        if (!err) {
            errobj.error = "ws error";
        }
        else {
            var msg = err.message ? err.message : (typeof err == "string" ? err : "ws error");
            errobj.error = msg;
        }
        return JSON.stringify(errobj);
    }
}


module.exports = WsHandler;