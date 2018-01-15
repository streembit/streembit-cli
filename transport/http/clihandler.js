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

const constants = require("libs/constants");
const config = require("libs/config");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const appinfo = require("libs/appinfo");

// 
// Service WS handler
//
class ClientRequestHandler  {
    constructor() {
    }

    senderror(res, err) {
        try {
            var errmsg = JSON.stringify({ error: err.message ? err.message : err });
            var buffer = new Buffer(errmsg);
            res.statusCode = 500;
            res.end(buffer);
        }
        catch (err) {
        }
    }

    sendbadrequest(res) {
        try {
            // send bad request
            res.statusCode = 405;
            res.end();
        }
        catch (err) {
        }
    }

    sendcomplete(res, data) {
        try {
            res.statusCode = 200;
            if (!data) {                
                res.end();
            }
            else {
                if (data && typeof data != "string") {
                    data = JSON.stringify(data);
                }
                var buffer = new Buffer(data);
                res.end(buffer);
            }
        }
        catch (err) {
            try {
                // send internal error
                res.statusCode = 500;
                res.end();
            }
            catch (e) {
            }
            logger.error("sendcomplete() error: " + err.message);
        }
    }


    getwsinfo(req, res) {
        try {
            var wsport = 0;
            if (config.transport && config.transport.ws && config.transport.ws.port) {
                wsport = config.transport.ws.port;
            }

            var clientcount = appinfo.wsclientcount;
            var available = appinfo.wsavailable;

            var result = { wsport: wsport, clientcount: clientcount, available: available };
            this.sendcomplete(res, result);
        }
        catch (err) {
            senderror(res, err);
            logger.error("getwsinfo() error: " + err.message);
        }
    }

    handle_request(data) {
        try {
            if (!data) return;

            var req = data.req;
            var res = data.res;            
            if (!res || !res.end || typeof res.end != "function") {
                // invalid response object
                return;
            }
            var message = data.message;
            if (!message || !message.type) {
                sendbadrequest(res);
            }

            var type = message.type;

            switch (type) {
                case "getwsinfo":
                    this.getwsinfo(req, res);
                    break;
                default:
                    this.sendbadrequest(res);
                    break;
            }
        }
        catch (err) {
            logger.error("handle_request() error: " + err.message);
        }
    }

    on_request() {
        try {    
            events.on(
                constants.ONCLIENTREQUEST,
                (data) => {
                    this.handle_request(data);
                }
            );
        }
        catch (err) {
            logger.error("on_request() error: " + err.message);
        }
    }
}


module.exports = ClientRequestHandler;