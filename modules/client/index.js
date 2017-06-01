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
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var streembit = streembit || {};

var async = require("async");
var config = require("libs/config");
var logger = require("libs/logger");
var peerutils = require("libs/peernet/peerutils");
const kad = require("libs/peernet/kad");
const Account = require("libs/account");
const msghandler = require("libs/peernet/msghandler");


module.exports = exports = function (callback) {
    try {
        var conf = config.client_config;
        if (!conf.run) {
            logger.debug("Don't run streembit client handler");
            return callback();
        }

        logger.info("Run streembit client handler");

        async.waterfall(
            [
                function (cb) {
                    var account = new Account();
                    account.init(cb)
                },
                function (cb) {
                    peerutils.discovery(config.host, config.seeds, cb)
                },
                function (host, cb) {
                    try {

                        if (config.host != host) {
                            config.host = host;
                        }

                        var options = {
                            seeds: config.seeds,
                            onKadMessage: msghandler.on_kad_message,
                            onPeerMessage: msghandler.on_peer_message,
                            onTransportError: msghandler.on_transport_error,
                            isseed: false
                        };

                        var kadnet = new kad.KadHandler();
                        kadnet.init(options, cb);
                    }
                    catch (e) {
                        callback(e.message);
                    }
                },
                function (cb) {

                }
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }

                logger.info("Client handler started");
                callback();
            }
        );

    }
    catch (err) {
        callback(err.message);
    }
};