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
const Wshandler = require("./handler");
const iotdefinitions = require("apps/iot/definitions");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const WebSocket = require('ws');
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");
const createHmac = require('create-hmac');
const secrand = require('secure-random');
const WsDb = require("libs/database/wsdb");
const appinfo = require('libs/appinfo');
const peersrvc = require('libs/peernet/msghandlers/peer');

// 
// Service WS handler
//
class SrvcWsHandler extends Wshandler {
    constructor() {
        super();
        this.database = new WsDb();
    }

    senderror(ws, message, err) {
        try {
            var errmsg = super.format_error((message && message.txn ? message.txn : 0), err);
            ws.send(errmsg);
        }
        catch (e) {
        }
    }

    put(ws, message) {
        try {
            peersrvc.put(message, (err) => {
                try {
                    if (err) {
                        return this.senderror(ws, message, err);
                    }

                    let response = { result: 0, txn: message.txn };
                    ws.send(JSON.stringify(response));
                }
                catch (xerr) {
                    try {
                        this.senderror(ws, message, xerr.message);
                        logger.error("SrvcWsHandler put error: " + xerr.message);
                    }
                    catch (e) { }
                }
            });
        }
        catch (e) {
            this.senderror(ws, message, e.message);
            logger.error("SrvcWsHandler put error: " + e.message);
        }
    }

    register(ws, message) {
        if (!message.publickey || !message.pkhash || !message.account) {
            return Promise.reject(new Error("invalid parameter at WS register"));
        }

        let token = secrand.randomBuffer(16).toString("hex");
        this.list_of_sessions.set(message.pkhash, { token: token, ws: ws, lastseen: Date.now() });
        // set the id (use the token) at the WS object
        ws.clienttoken = token;

        logger.debug("user session created for pkhash: " + message.pkhash + " token: " + token);

        try {
            this.database.register(message.pkhash, message.publickey, token, message.account)
            .then(
                () => {
                    let response = { result: 0, txn: message.txn, payload: { token: token } };
                    ws.send(JSON.stringify(response));
                }
            )
            .catch(
                (err) => {
                    this.senderror(ws, message, (err && err.message) || "db register error");
                    logger.error("SrvcWsHandler register error: " + err.message);
                }
            );

        }
        catch (err) {
            this.senderror(ws, message, err.message);
            logger.error("SrvcWsHandler register error: " + err.message);
        }
    }

    // handles messages from the client
    processmsg(ws, request) {
        try {
            var message = JSON.parse(request);
            if (!message.action || !message.txn) {
                //TODO report this client as it is sending a bogus message, another 3 bogus message and blacklist it
                return;
            }

            switch (message.action) {
                case "register":
                case "put":
                    this[message.action](ws, message);
                    break;
                default:
                    //TODO report this client as it is sending a bogus message, another 3 bogus message and blacklist it
                    break;
            }
        }
        catch (err) {
            logger.error("ws on_send() error: " + err.message);
        }
    }

    send_wsclient(id, data) {
        try {
            let pkhash = this.list_of_devices.get(id);
            if (pkhash) {
                return;
            }

            let session = this.list_of_sessions.get(pkhash);
            if (session) {
                let ws = session.ws;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    let response = JSON.stringify(data);
                    ws.send(response);
                }
                else {
                    // TODO report this closed connection
                    this.list_of_sessions.delete(pkhash);
                    ws.terminate();
                }
            }            
        }
        catch (err) {
            logger.error("WS send_wsclient() event handler error: " + err.message);
        }
    }

    on_send() {
        try {    
            events.on(
                constants.ONSENDTOWSCLIENT,
                (id, data) => {
                    this.send_wsclient(id, data);
                }
            );
        }
        catch (err) {
            logger.error("ws on_send() error: " + err.message);
        }
    }
}


module.exports = SrvcWsHandler;