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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const constants = require("libs/constants");
const iotdefinitions = require("apps/iot/definitions");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const WebSocket = require('ws');
const util = require("util");
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");
const createHmac = require('create-hmac');

class WsServer {
    constructor(port, max_connections) {
        this.port = port;
        this.max_connections = max_connections || 150; 
        this.list_of_sessions = new Map();
        this.list_of_devices = new Map();
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

    auth_client(jwt, ws) {
        try {
            if (!jwt) {
                throw new Error("no WS auth jwt presented");
            }

            var res = msgvalidator.verify_wsjwt(jwt);

            this.list_of_sessions.set(res.pkhash, { token: res.token, ws: ws });
            logger.debug("user session created for pkhash: " + res.pkhash);

            if (res.devices && Array.isArray(res.devices)) {
                res.devices.forEach(
                    (device) => {
                        this.list_of_devices.set(device, res.pkhash);
                    }
                );
            }

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
        if (!message.pkhash || !message.hmacdigest || !message.txn) {
            throw new Error("invalid authentication fields");
        }

        var usersession = this.list_of_sessions.get(message.pkhash);
        if (!usersession) {
            throw new Error("invalid user WS session");
        }
        var token = usersession.token;
        if ( !token ) {
            throw new Error("invalid authentication token data");
        }

        // validate the hmac
        var hmac = createHmac('sha256', token);
        hmac.update(message.txn);
        var hmacdigest = hmac.digest('hex');

        if (hmacdigest != message.hmacdigest) {
            throw new Error("invalid authentication secret");
        }

        // the message is valid, check if the deviceid is registered
        var deviceid = message.id;
        if (deviceid) {
            if (!this.list_of_devices.has(deviceid)) {
                this.list_of_devices.set(deviceid, message.pkhash);
            }
        }

        //console.log("message.hmacdigest: " + message.hmacdigest + " computed hmacdigest: " + hmacdigest);    
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

                var resdata = this.auth_client(message.jwt, ws);
                resdata.txn = message.txn;
                var response = JSON.stringify(resdata);
                ws.send(response);

                //
            }
            else {
                // validate the user sent a valid token                
                this.validate_user(message);

                events.iotmsg(
                    message,
                    (err, data) => {
                        try {
                            if (err) {
                                throw new Error(err.message || err);
                            }

                            if (!data) {
                                throw new Error("the device ONIOTEVENT handler returned an invalid data");
                            }

                            data.txn = message.txn;
                            var response = JSON.stringify(data);
                            ws.send(response);
                        }
                        catch (err) {
                            try {
                                var errmsg = this.format_error(message.txn, err);
                                ws.send(errmsg);
                                logger.error("ONIOTEVENT return handling error %j", errmsg)
                            }
                            catch (e) {
                            }
                        }
                    }
                );
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

    handle_server_messages() {
        try {
            events.on(
                iotdefinitions.EVENT_NOTIFY_USERS,
                (id, data) => {
                    try {
                        let pkhash = this.list_of_devices.get(id);
                        if (pkhash) {
                            let session = this.list_of_sessions.get(pkhash);
                            if (session) {
                                let ws = session.ws;
                                if (ws && ws.readyState === WebSocket.OPEN) {
                                    let response = JSON.stringify(data);
                                    ws.send(response);
                                }
                                else {
                                    // TODO report this closed connection
                                }
                            }
                        }
                    }
                    catch (err) {
                        logger.error("ws shandle_server_messages() event handler error: " + err.message);
                    }
                }
            );
        }
        catch (err) {
            logger.error("ws shandle_server_messages() error: " + err.message);
        }
    }

    init(callback) {
        try {

            logger.info("Starting ws server");  
            
            const wsserver = new WebSocket.Server(
                {
                    port: this.port
                }
            );

            // set the connection handler
            wsserver.on('connection', (ws) => {
                try {             
                    //console.log("ws client connected");
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
                //TODO signal the app that the server was closed
                logger.info("Web socket server was closed");
            });

            wsserver.on('error', function(e) {
                logger.error('ws error: %s', e.message);
            });

            wsserver.on('listening', function (e) {
                logger.info('ws server listening');
            });

            // listen to messages from the devices, etc. to the client
            this.handle_server_messages();

            callback();

            //
        }
        catch (err) {
            callback("ws server init error: " + err.message);
        }
    }
}

module.exports = WsServer;
