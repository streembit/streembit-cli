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

const constants = require("libs/constants");
const Wshandler = require("./handler");
const iotdefinitions = require("apps/iot/definitions");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const WebSocket = require('ws');
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");
const createHmac = require('create-hmac');
const secrand = require('secure-random');


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

    register(ws, message) {
        try {
            if (!message.publickey || !message.pkhash || !message.account) {
                throw new Error("invalid parameter at WS peer");
            }

            var account = message.account;
            var publickey = message.publickey;
            var pkhash = message.pkhash;

            //socket.streembit_account = account;
            //clients.set_account_socket(account, { publickey: publickey, socketid: socket.id, socket: socket, contacts: [] });
            //// add to the database
            //storage.contact_save(account, publickey, pkhash, transport, address, port, ctype, function (err) {
            //    if (err) {
            //        return callback("error in adding contact to database");
            //    }

            //    callback();
            //    logger.debug("ws register_account from: " + account);
            //});

            var token = secrand.randomBuffer(16).toString("hex");
            this.list_of_sessions.set(message.pkhash, { token: token, ws: ws });
            logger.debug("user session created for pkhash: " + message.pkhash);

            var msg = { result: 0, txn: message.txn, payload: { token: token }};
            var response = JSON.stringify(msg);
            ws.send(response);

            //
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