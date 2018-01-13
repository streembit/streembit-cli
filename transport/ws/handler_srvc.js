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


// 
// Service WS handler
//
class SrvcWsHandler extends Wshandler {
    constructor() {
        super();
    }

    senderror(ws, message, err) {
        try {
            var errmsg = super.format_error((message && message.txn ? message.txn : 0), err);
            ws.send(errmsg);
        }
        catch (e) {
        }
    }

    async register(ws, message) {
        if (!message.publickey || !message.pkhash || !message.account) {
            return Promise.reject(new Error("invalid parameter at WS peer"));
        }

        const token = secrand.randomBuffer(16).toString("hex");
        this.list_of_sessions.set(message.pkhash, { token: token, ws: ws });

        logger.debug("user session created for pkhash: " + message.pkhash);

        try {
            // TODO add here the piece that saves the client's data in the SQLITE database
            // so add a new SQLITE table, function to save, etc.
            const wsdb = new WsDb();
            try {
                const the_client = await wsdb.get_client(message.pkhash);
                if (typeof the_client === 'undefined') {
                    await wsdb.add_client(message.pkhash, message.publickey, token, 1, message.account);
                } else {
                    await wsdb.update_client(message.pkhash, { token: token, isactive: 1 })
                }
                const response = { result: 0, txn: message.txn, payload: { token: token }};
                ws.send(JSON.stringify(response));
            } catch (err) {
                return Promise.reject(new Error(err.message));
            }

            return Promise.resolve();
        } catch (err) {
            this.senderror(ws, message, err.message);
            logger.error("SrvcWsHandler register error: " + err.message);

            return Promise.reject(new Error(err.message));
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
                    this.register(ws, message);
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