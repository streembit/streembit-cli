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

const Wshandler = require("./handler");
const iotdefinitions = require("apps/iot/definitions");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const WebSocket = require('ws');
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");
const createHash = require('create-hash');
const createHmac = require('create-hmac');
const peermsg = require("libs/message");
const util = require("util");

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

            const sha1st = createHash("sha512").update(res.token).digest("hex");
            const symmcryptkey = createHash("sha512").update(sha1st).digest("hex");

            this.list_of_sessions.set(res.pkhash, { token: res.token, ws: ws, symmcryptkey: symmcryptkey });
            logger.debug("user session created for pkhash: " + res.pkhash);

            if (res.devices && Array.isArray(res.devices)) {
                res.devices.forEach(
                    (device) => {
                        let lowercase_device = device.toLowerCase();
                        logger.debug(`list_of_devices add: ${lowercase_device}`);
                        this.list_of_devices.set(lowercase_device, res.pkhash);
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

        let data;
        try {
            const plain_text = peermsg.aes256decrypt(usersession.symmcryptkey, message.cipher);

            data = JSON.parse(plain_text);
            // copy the txn into the message new data structure
            data.txn = message.txn;
        }
        catch (err) {
            if (err.message && err.message.indexOf("decrypt") > -1) {
               throw new Error("Hub message decrypt error");
            }
            else {
                throw new Error("Hub message decode error: " + err.message);
            }
        }

        // the message is valid, check if the deviceid is registered
        var deviceid = data.id;
        if (deviceid) {
            if (!this.list_of_devices.has(deviceid)) {
                let lowercase_device = deviceid.toLowerCase();
                logger.debug(`list_of_devices add: ${lowercase_device}`);
                this.list_of_devices.set(lowercase_device, message.pkhash);
            }
        }

        return data;
    }

    iotsend(k, data) {
        let lowercase_device = k.toLowerCase();
        let pkhash = this.list_of_devices.get(lowercase_device);
        const session = this.list_of_sessions.get(pkhash);
        if (session) {
            let ws = session.ws;
            if (ws && ws.readyState === WebSocket.OPEN) {
                try {
                    data.payload = peermsg.aes256encrypt(session.symmcryptkey, JSON.stringify(data.payload));

                    const response = JSON.stringify(data);
                    ws.send(response);
                } catch (err) {
                    console.log(err)
                }
            }
            else {
                // TODO report this closed connection
                throw new Error('WebSocket readyState is ' +ws.readyState);
            }
        }
        else {
            throw new Error('Session not found. device ID: ' +k);
        }
    }

    // event handler to send messages back to the client
    on_send() {
        try {
            events.on(
                iotdefinitions.EVENT_NOTIFY_USERS,
                (id, data) => {
                    try {
                        if (!data || !data.payload) {
                            return logger.error("EVENT_NOTIFY_USERSevent handler error: invalid data.payload ");
                        }

                        logger.debug('EVENT_NOTIFY_USERS event signalled');
                        let lowercase_device = id.toLowerCase();
                        let pkhash = this.list_of_devices.get(lowercase_device);
                        if (!pkhash) {
                            // try the gatewayid
                            if (data.payload.gatewayid) {
                                pkhash = this.list_of_devices.get(data.payload.gatewayid);
                            }
                        }

                        if (!pkhash) {
                            return logger.debug(`EVENT_NOTIFY_USERS cannot complete, pkhash is empty for device ID: ${id}`);
                        }
                       
                        const session = this.list_of_sessions.get(pkhash);
                        if (!session) {
                            return logger.debug(`EVENT_NOTIFY_USERS cannot complete, no WS session for device ID: ${id}`);
                        }
                  
                        let ws = session.ws;
                        if (!ws) {
                            return logger.debug(`EVENT_NOTIFY_USERS cannot complete, no WS object for device ID: ${id}`);
                        }
                  
                        if (ws.readyState === WebSocket.OPEN) {
                            let sendobj = Object.assign({}, data);
                            logger.debug(`on_send->data.payload: ${util.inspect(data.payload)}`);
                            sendobj.payload = peermsg.aes256encrypt(session.symmcryptkey, JSON.stringify(sendobj.payload));

                            const response = JSON.stringify(sendobj);
                            ws.send(response);
                        }
                        else {
                            // the socket was closed, remove the session
                            logger.debug(`Remove WS session for ${pkhash}`);
                            this.list_of_sessions.delete(pkhash);
                        }
                    }
                    catch (err) {
                        logger.error("ws handle_server_messages() event handler error: " + err.message);
                    }
                }
            );
        }
        catch (err) {
            logger.error("EVENT_NOTIFY_USERS error: " + err.message);
        }
    }

    auth(ws, request, message) {
        if (!message.jwt) {
            throw new Error("invalid auth payload");
        }

        var resdata = this.auth_client(message.jwt, ws);
        var session_key = resdata.session_key;
        resdata.txn = message.txn;

        var data = JSON.stringify(resdata);
        return ws.send(data);
    }

    // handles messages from the client
    processmsg(ws, request) {
        var message = 0;
        try {
            //logger.debug(`processmsg->request: ${request}`);
            message = JSON.parse(request);
            if (!message) {
                throw new Error("invalid payload");
            }

            if (message.auth) {
                return this.auth(ws, request, message)
            }

            // it is not an auth message so the HMAC must match
            // validate whether or not the user sent a valid token                
            const msg_data = this.validate_user(message);
            logger.debug(`processmsg->msg_data: ${util.inspect(msg_data)}`)
            events.iotmsg(
                msg_data,
                (err, data) => {
                    try {
                        if (err) {
                            throw new Error(err.message || err);
                        }

                        if (!data) {
                            throw new Error("the device ONIOTEVENT handler returned an invalid data");
                        }

                        data.txn = message.txn;
                        
                        this.iotsend(msg_data.id, data);
                    }
                    catch (err) {
                        try {
                            var errmsg = super.format_error(message.txn, 0, err);
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
                var errmsg = super.format_error((message && message.txn ? message.txn : 0), 0, err);
                ws.send(errmsg);
                logger.error("sent to client ws error %j", errmsg)
            }
            catch (e) {
            }
        }
    }
}


module.exports = IoTWsHandler;