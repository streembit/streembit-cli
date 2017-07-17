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
Author: Tibor Zsolt Pardi
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const logger = require("libs/logger");
const async = require("async");
const peermsg = require("./msghandlers/peer.js");
const storemsg = require("./msghandlers/store.js");
const txnmsg = require("./msghandlers/txn.js");
const bchmsg = require("./msghandlers/bch.js");
const fnodemsg = require("./msghandlers/fnode.js");

module.exports.on_transport_error = function (err) {
    //TODO error handling
    logger.error('KAD transport error: %j', err);
}

function validate_contact(callback) {
    logger.debug('validate_contact');
    callback();
}

function handle_msg(message, callback) {
    try {
        if (!message || !message.method) {
            return callback();
        }

        var method = message.method.toLowerCase(message.method);
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
    }
    catch (err) {
        logger.error('handle_msg error: %j', err);
        return callback(err);
    }
}

module.exports.on_kad_message = function (message, contact, next){

    logger.debug("on_kad_message");

    async.waterfall(
        [
            function (cb) {
                try {
                    validate_contact(cb)
                }
                catch (e) {
                    cb(e);
                }
            },
            function (cb) {
                try {
                    handle_msg(message, cb);
                }
                catch (e) {
                    cb(e);
                }
            }
        ],
        function (err) {
            next(err);
        }
    );

}

module.exports.on_peer_message = function (msg, callback) {
    logger.debug("on_peer_message");
    peermsg(msg, callback);
}