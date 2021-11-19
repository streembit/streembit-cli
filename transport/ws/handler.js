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

// const errcodes = require('streembit-errcodes');

import * as errcodes from 'streembit-errcodes';

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

    format_error(txn, errcode, err) {

        if (!errcode || errcode < 1 || errcode >= errcodes.MAX_ERROR_CODE) {
            // this is an invalid error code, send a valid one
            errcode = errcode.WS;
        }

        var errobj = {
            txn: txn,
            error: errcode,
            msg: ''
        };


        // try to get a valid message
        try {
            if (err) {
                if (typeof err == "number" && err > 0 || err < errcodes.MAX_ERROR_CODE) {
                    // the error is a errcode
                    errobj.msg = err;
                }
                else if (err.message) {
                    // this is most likely an Error object that has a message property
                    errobj.msg = err.message;
                }
                else {
                    if (typeof err == "string") {
                        errobj.msg = err;
                    }
                    else {
                        // don't try to populate anymore the error message
                    }
                }
            }            
        }
        catch (e) { }

        var errmsg = JSON.stringify(errobj);
        return errmsg;
    }
}


// module.exports = WsHandler;
export { WsHandler };