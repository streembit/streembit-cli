/*

This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines.

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Z Pardi
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

import { logger } from "streembit-util";
import async from "async";


import * as peermsg from './msghandlers/peer.js'
import { default as txnmsg } from './msghandlers/txn.js'
import { default as bchmsg } from './msghandlers/bch.js'
import { default as fnodemsg } from './msghandlers/fnode.js'


export const on_transport_error = (err) => {
    //TODO error handling
    logger.error('KAD transport error: %j', err);
}

const validate_contact = (callback) => {
    logger.debug('validate_contact');
    callback();
}

const handle_msg = (message, callback) => {
    try {
        if (!message || !message.method) {
            return callback();
        }

        logger.info(`RMTP message ${message.method} received`);

        const method = message.method.toLowerCase(message.method);
        switch (method) {
            case "store":
                storemsg(message, callback);
                break;
            case "txn":
                txnmsg(message, callback);
                break;
            case "bch":
                bchmsg(message, callback);
                break;
            case "find_node":
                fnodemsg(message, callback);
                break;
            default:
                return callback();
        }
    } catch (err) {
        logger.error('handle_msg error: %j', err);
        return callback(err);
    }
}

export const on_kad_message = (message, contact, next) => {

    logger.debug("on_kad_message");

    async.waterfall(
        [
            (cb) => {
                try {
                    validate_contact(cb)
                }
                catch (e) {
                    cb(e);
                }
            },
            (cb) => {
                try {
                    handle_msg(message, cb);
                }
                catch (e) {
                    cb(e);
                }
            }
        ],
        (err) => {
            next(err);
        }
    );

}

export const on_peer_message = (msg, callback) => {
    logger.debug("on_peer_message");
    peermsg(msg, callback);
}