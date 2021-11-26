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

import { logger, events } from 'streembit-util';
import { constants } from '../../libs/constants/index.js';
import ClientSrvc from '../../libs/clientsrvc/index.js';
import * as errcodes from 'streembit-errcodes';
import * as peersrvc from '../../libs/peernet/msghandlers/peer.js';

// 
// Service WS handler
//
class ClientRequestHandler  {
    constructor() {
    }

    senderror(res, errcode, err) {
        try {

            if (!errcode || errcode < 1 || errcode >= errcodes.MAX_ERROR_CODE) {
                // this is an invalid error code, send a valid one
                errcode = errcode.HTTP;
            }

            const errobj = {
                error: errcode,
                msg: ''
            };

            // try to get a valid message
            try {
                if (err) {
                    if (err.message) {
                        errobj.msg = err.message
                    }
                }
                else {
                    if (typeof err == "string") {
                        errobj.msg = err;
                    }
                    else {
                        errobj.msg = "" + err; // convert to string
                    }
                }
            }
            catch (e) { }

            const errmsg = JSON.stringify(errobj);
            const buffer = Buffer.from(errmsg);
            res.statusCode = 200;
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
                const buffer = Buffer.from(data);
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

    ping(req, res, message) {
        try {
            let clientip = req.connection.remoteAddress;
            if (req.socket.address().family === 'IPv6') {
                clientip = clientip.replace(/^::ffff:/, '');
            }

            this.sendcomplete(res, { result: 0, clientip: clientip });
        }
        catch (err) {
            this.senderror(res, errcodes.HTTP_HANDLEREQUEST, err);
            logger.error("ping() error: " + err.message);
        }
    }

    //
    //  Returns the list of peers that handles WebSocket connections. 
    //  Users on the Streembit network can get services from WS enabled peers such as facilitating video calls (via WebRTC signalling).
    //  This function returns the list of WS peers that serves the users. 
    //
    getwspeers(req, res, message) {
        try {
            const result = ClientSrvc.getwspeers();
            if (!result) {
                throw new Error("failed to get wsinfo")
            }
            this.sendcomplete(res, result);
        }
        catch (err) {
            this.senderror(res, errcodes.HTTP_NOWSPEERS, err);
            logger.error("getwsinfo() error: " + err.message);
        }
    }

    dhtput(req, res, message) {
        try {
            peersrvc.put(message, (err) => {
                try {
                    if (err) {
                        return this.senderror(res, errcodes.WS_DHTPUT, err);
                    }

                    this.sendcomplete(res, { result: 0 });
                }
                catch (xerr) {
                    try {
                        this.senderror(res, errcodes.WS_DHTPUT, xerr.message);
                        logger.error("dhtput peersrvc put error: " + xerr.message);
                    }
                    catch (e) { }
                }
            });
        }
        catch (e) {
            this.senderror(res, errcodes.HTTP_HANDLEREQUEST, err);
            logger.error("dhtput() error: " + err.message);
        }
    }

    txn(req, res, message) {
        try {
            logger.debug("HTTP clihandler txn");

            if (!message || !message.txnhex) {
                return this.senderror(res, errcodes.HTTP_HANDLEREQUEST, "invalid transaction");
            }

            // submit the transaction to the blockchain transaction handlers
            events.bcmsg({ type: constants.ONTXNREQUEST, data: message.txnhex });

            this.sendcomplete(res, { result: 0 });
        }
        catch (err) {
            this.senderror(res, errcodes.HTTP_NOWSINFO, err);
            logger.error("txn() error: " + err.message);
        }
    }

    getwsinfo(req, res) {
        try {
            const result = ClientSrvc.getwsinfo();
            if (!result) {
                throw new Error("failed to get wsinfo")
            }

            this.sendcomplete(res, result);
        }
        catch (err) {
            this.senderror(res, errcodes.HTTP_NOWSINFO, err);
            logger.error("getwsinfo() error: " + err.message);
        }
    }

    handle_request(data) {
        try {
            if (!data) return;

            const req = data.req;
            const res = data.res;
            if (!res || !res.end || typeof res.end != "function") {
                // invalid response object, cannot continue as there is no transport to send back anything
                return;
            }

            const message = data.message;
            if (!message || !message.type) {
                sendbadrequest(res);
            }

            const type = message.type;

            switch (type) {
                case "ping":
                case "getwsinfo":
                case "getwspeers":
                case "dhtput":
                case "txn":
                    // a funciton with the same name as the type must exists
                    this[type](req, res, message);
                    break;
                default:
                    this.sendbadrequest(res);
                    break;
            }
        }
        catch (err) {
            this.senderror(data.res, errcodes.HTTP_HANDLEREQUEST, err);
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

export default ClientRequestHandler;