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
const clientsrvc = require("libs/clientsrvc");

// 
// Service WS handler
//
class ClientRequestHandler  {
    constructor() {
    }

    handle_exception(data, err) {
        try {
            if (data && data.res && data.res.end && data.res.end == "function") {
                this.senderror(data.res, err);
            }
        }
        catch (err) {
            logger.error("handle_exception() error: " + err.message);
        }
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

    //
    //  Returns the list of peers that handles WebSocket connections. 
    //  Users on the Streembit network can get services from WS enabled peers such as facilitating video calls (via WebRTC signalling).
    //  This function returns the list of WS peers that serves the users. 
    //
    getwspeers(req, res, message) {
        try {
            var result = clientsrvc.getwspeers();
            if (!result) {
                throw new Error("failed to get wsinfo")
            }
            this.sendcomplete(res, result);
        }
        catch (err) {
            senderror(res, err);
            logger.error("getwsinfo() error: " + err.message);
        }
    }

    getwsinfo(req, res) {
        try {
            var result = clientsrvc.getwsinfo();
            if (!result) {
                throw new Error("failed to get wsinfo")
            }

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
                case "getwspeers":
                    // a funciton with the same name as the type must exists
                    this[type](req, res, message);
                    break;
                default:
                    this.sendbadrequest(res);
                    break;
            }
        }
        catch (err) {
            this.handle_exception(data, err);
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