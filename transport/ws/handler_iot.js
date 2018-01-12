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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
*/

'use strict';

const Wshandler = require("./handler");
const iotdefinitions = require("apps/iot/definitions");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const WebSocket = require('ws');
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");
const createHmac = require('create-hmac');

class IoTWsHandler extends Wshandler {
    constructor() {
        super();
        this.list_of_devices = new Map();
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
        if (!token) {
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

    // event handler to send messages back to the client
    on_send() {
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
            logger.error("ws on_send() error: " + err.message);
        }
    }

    auth(ws, request, message) {
        if (!message.jwt) {
            throw new Error("invalid auth payload");
        }

        var resdata = this.auth_client(message.jwt, ws);
        resdata.txn = message.txn;
        var response = JSON.stringify(resdata);
        return ws.send(response);
    }

    // handles messages from the client
    processmsg(ws, request) {
        var message = 0;
        try {
            message = JSON.parse(request);
            if (!message) {
                throw new Error("invalid payload");
            }

            if (message.auth) {
                return this.auth(ws, request, message)
            }

            // it is not an auth message so the HMAC must match
            // validate whether or not the user sent a valid token                
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
                            var errmsg = super.format_error(message.txn, err);
                            ws.send(errmsg);
                            logger.error("ONIOTEVENT return handling error %j", errmsg)
                        }
                        catch (e) {
                        }
                    }
                }
            );
            
        }
        catch (err) {
            try {
                var errmsg = super.format_error((message && message.txn ? message.txn : 0), err);
                ws.send(errmsg);
                logger.error("sent to client ws error %j", errmsg)
            }
            catch (e) {
            }
        }
    }
}


module.exports = IoTWsHandler;