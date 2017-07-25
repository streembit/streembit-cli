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
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const constants = require("libs/constants");
const logger = require("libs/logger");
const events = require("libs/events");
const WebSocket = require('ws');
const util = require("util");
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");

class WsServer {
    constructor(port) {
        this.port = port;
        this.user_sessions = new Map();
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

    authorize(message) {

        return true;
    }

    send(ws, msg) {
        try {
            ws.send(msg)
        }
        catch (err) {
            logger.error("ws send error: %j", err)
        }
    }

    auth_client(jwt) {
        try {
            if (!jwt) {
                throw new Error("no WS auth jwt presented");
            }

            var res = msgvalidator.verify_wsjwt(jwt);

            this.user_sessions.set(res.username, res.token);
            logger.debug("user session created for " + res.username);

            return {
                payload: {
                    authenticated: true
                }
            };
        }
        catch (err) {
            throw err;
        }
    }

    validate_user(message) {
        if (!message.user || !message.authtoken) {
            throw new Error("invalid authentication fields");
        }

        if (!this.user_sessions.has(message.user)) {
            throw new Error("invalid authentication user data");
        }

        var token = this.user_sessions.get(message.user);
        if (!token || (token != message.authtoken)) {
            throw new Error("invalid authentication token data");
        }

        //console.log(message.user + " with token " + token + " authenticated");
    }

    processmsg(ws, request) {
        var message = 0;
        try {
            message = JSON.parse(request);
            if (!message) {
                throw new Error("invalid payload");
            }

            if (message.auth ) {
                if (!message.jwt) {
                    throw new Error("invalid auth payload");
                }

                var resdata = this.auth_client(message.jwt);
                resdata.txn = message.txn;
                var response = JSON.stringify(resdata);
                ws.send(response);

                //
            }
            else {
                // validate the user sent a valid token                
                this.validate_user(message);

                events.emit(events.TYPES.ONIOTEVENT, constants.IOTREQUEST, message, (err, data) => {
                    try {
                        if (err) {
                            throw new Error(err.message || err);
                        }

                        if (!data) {
                            throw new Error("the device IOTREQUEST handler returned an invalid data");
                        }

                        data.txn = message.txn;
                        var response = JSON.stringify(data);
                        ws.send(response);
                    }
                    catch (err) {
                        try {
                            var errmsg = this.format_error(message.txn, err);
                            ws.send(errmsg);
                            logger.error("IOTREQUEST return handling error %j", errmsg)
                        }
                        catch (e) {
                        }
                    }
                });
            }
        }
        catch (err) {
            try {
                var errmsg = this.format_error((message && message.txn ? message.txn : 0), err);
                ws.send(errmsg);
                logger.error("sent to client ws error %j", errmsg)
            }
            catch (e) {
            }           
        }
    }
 
    on_connection(ws) {
        try {         
            ws.on('message', (message) => {
                this.processmsg(ws, message);
            });

            // check if the connection was authorized

            //  ws.terminate()

            //
        }
        catch (err) {
            logger.error("ws on_connection error: " + err.message);
        }
    }

    init() {
        try {

            logger.info("starting ws server");  
            
            const wsserver = new WebSocket.Server(
                {
                    port: this.port
                }
            );

            // set the connection handler
            wsserver.on('connection', (ws) => {
                try {
                    //var $self = this;

                    console.log("ws client connected");

                    ws.on('message', (message) => {
                        this.processmsg(ws, message);
                    });

                    //
                }
                catch (err) {
                    logger.error("ws on_connection error: " + err.message);
                }
            });

            wsserver.on('close', function() {

            });

            wsserver.on('error', function(e) {
                logger.error('ws error: %s', e.message);
            });

            //
        }
        catch (err) {
            logger.error("ws server init error: " + err.message);
        }
    }
}

module.exports = WsServer;

