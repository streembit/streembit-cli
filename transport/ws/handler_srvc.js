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

import { constants } from "../../libs/constants/index.js";
import { logger, events } from "streembit-util";
import { Account } from "../../libs/account/index.js";
import { WsHandler } from "./handler.js";
import { WsDb } from "../../libs/database/wsdb.js"

// const Wshandler = require("./handler");

// const constants = require("libs/constants");
// const Wshandler = require("./handler");
// const iotdefinitions = require("apps/iot/definitions");
// const logger = require("streembit-util").logger;
// const events = require("streembit-util").events;
// const WebSocket = require('ws');
// const msgvalidator = require("libs/peernet/msghandlers/msg_validator");
// const createHmac = require('create-hmac');
// const secrand = require('secure-random');
// const WsDb = require("libs/database/wsdb");
// const appinfo = require('libs/appinfo');
// const PeerNet = require("libs/peernet");
// const peersrvc = require('libs/peernet/msghandlers/peer');
// const peermsg = require("libs/message");
// const errcodes = require('streembit-errcodes');
// const Account = require("libs/account");
// const config = require("libs/config");
// const bs58check = require('bs58check');
// const createHash = require("create-hash");

// 
// Service WS handler
//
class SrvcWsHandler extends WsHandler {
    constructor() {
        super();
        this.database = new WsDb();
    }

    senderror(ws, message, errcode, err) {
        try {
            var errmsg = super.format_error((message && message.txn ? message.txn : 0), errcode, err);
            ws.send(errmsg);
        }
        catch (e) {
        }
    }

    peermsg(ws, message) {
        try {
            if (!message || !message.contact || !message.contact.pkhash) {
                return this.senderror(ws, message, errcodes.WS_PEERMSG, errcodes.BADPARAM);
            }

            let pkhash = message.contact.pkhash;
            let session = this.list_of_sessions.get(pkhash);
            if (!session) {
                return this.senderror(ws, message, errcodes.WS_CONTACT_SESSION);
            }

            let contactws = session.ws;
            if (!contactws || contactws.readyState != WebSocket.OPEN) {
                // TODO report this closed connection
                this.list_of_sessions.delete(pkhash);
                contactws.terminate();
                throw new Error("closed contact WS connection at WS peermsg");
            }

            // forward it to the contact
            let peermessage = JSON.stringify({ type: "PEERMSG", contact: message.contact, payload: message.payload });
            contactws.send(peermessage);

            // reply to the sender client
            let response = { result: 0, txn: message.txn };
            ws.send(JSON.stringify(response));

        }
        catch (err) {
            this.senderror(ws, message, errcodes.WS_PEERMSG, err.message);
            logger.error("SrvcWsHandler peermsg error: " + err.message);
        }
    }

    dhtget(ws, message) {
        // TODO: if this is a request that want to get a contact offer which format is key: contact1/contact2 & value:the_offer 
        // then we need to verify that contact2 is indeed the the WS client who sends this request. 
        // In order to verify the WS client must sign the message, so this request should be a JWT.
        // We must do this as the WS peer only should return contact offer to the designated user By verifying the signature 
        // we can determine whether or not the WS client is the designated user i.e. user2
        //
        
        try {
            logger.debug("WS dhtget txn: " + message.txn);
            peersrvc.get(message, (err, value) => {
                try {
                    if (err) {
                        return this.senderror(ws, message, errcodes.WS_DHTGET, err);
                    }

                    let response = { result: 0, txn: message.txn, payload: { value: value }};
                    ws.send(JSON.stringify(response));
                }
                catch (xerr) {
                    try {
                        this.senderror(ws, message, errcodes.WS_DHTGET, xerr.message);
                        logger.error("SrvcWsHandler put error: " + xerr.message);
                    }
                    catch (e) { }
                }
            });
        }
        catch (e) {
            this.senderror(ws, message, errcodes.WS_DHTGET,  e.message);
            logger.error("SrvcWsHandler put error: " + e.message);
        }
    }

    dhtput(ws, message) {
        try {
            peersrvc.put(message, (err) => {
                try {
                    if (err) {
                        return this.senderror(ws, message, errcodes.WS_DHTPUT, err);
                    }

                    let response = { result: 0, txn: message.txn };
                    ws.send(JSON.stringify(response));
                }
                catch (xerr) {
                    try {
                        this.senderror(ws, message, errcodes.WS_DHTPUT, xerr.message);
                        logger.error("SrvcWsHandler put error: " + xerr.message);
                    }
                    catch (e) { }
                }
            });
        }
        catch (e) {
            this.senderror(ws, message, errcodes.WS_DHTPUT, e.message);
            logger.error("SrvcWsHandler put error: " + e.message);
        }
    }

    register(ws, message) {
        try {
            if (!message.publickey || !message.pkhash || !message.account) {
                return this.senderror(ws, message, errcodes.WS_REGISTER, errcodes.BADPARAM);
            }

            let token = secrand.randomBuffer(16).toString("hex");
            this.list_of_sessions.set(message.pkhash, { token: token, ws: ws, lastseen: Date.now() });
            // set the id (use the token) at the WS object
            ws.clienttoken = token;

            logger.debug("user session created for pkhash: " + message.pkhash + " token: " + token);

            this.database.register(message.pkhash, message.publickey, token, message.account)
            .then(
                () => {
                    try {
                        const account = new Account();
                        const peernet = new PeerNet();

                        const buffer = new Buffer(account.public_key, 'hex');
                        const rmd160buffer = createHash('rmd160').update(buffer).digest();
                        const signature = bs58check.encode(rmd160buffer);
                        const jwt_plain = {
                            token: token,
                            data: {
                                pkhash: message.pkhash,
                                time: Date.now()
                            },
                            sign: signature,
                            public_key: account.bs58pk
                        };

                        const id = peernet.create_id();
                        const jwt = peermsg.create_jwt_token(account.cryptokey, id, JSON.stringify(jwt_plain), null, null, account.bs58pk, null, null);

                        const response = { result: 0, txn: message.txn, payload: jwt };

                        ws.send(JSON.stringify(response));

                    }
                    catch (err) {
                        throw(new Error(err));
                    }
                }
            )
            .catch(
                (err) => {
                    this.senderror(ws, message, errcodes.WS_REGISTER, (err && err.message) || "database register error");
                    logger.error("SrvcWsHandler register error: " + err.message);
                }
            );

        }
        catch (err) {
            this.senderror(ws, message, errcodes.WS_REGISTER, err.message);
            logger.error("SrvcWsHandler register error: " + err.message);
        }
    }

    ping(ws, message) {

        if (!message.pkhash || !message.token) {
            return this.senderror(ws, message, errcodes.WS_PING, errcodes.BADPARAM);
        }

        try {
            const session = this.list_of_sessions.get(message.pkhash);
            const pong = { result: 0, txn: message.txn, payload: { pong: (session ? 1 : 0) } };

            ws.send(JSON.stringify(pong));
        }
        catch (err) {
            this.senderror(ws, message, errcodes.WS_PING, err.message);
            logger.error("SrvcWsHandler ping error: " +err.message);
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
                case "dhtput":
                case "dhtget":
                case "peermsg":
                case "ping":
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

export { SrvcWsHandler };
// module.exports = SrvcWsHandler;