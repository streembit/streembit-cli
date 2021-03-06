﻿/*

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

const config = require("libs/config");
const logger = require("streembit-util").logger;
const constants = require("libs/constants");
const async = require("async");
const HTTPTransport = require("transport/http")
const utils = require("libs/utils");

let instance = null;

const protocol = 'https';

class PeerClient{
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }

    query(message, callback) {
        var seeds = utils.shuffle(config.seeds);

        var response = null;
        var errormsg = null;

        function write(seed, cb) {
            seed.protocol = seed.protocol || protocol;
            HTTPTransport.write(message, seed, "/", function (err, msg) {
                var complete = false;
                if (err) {
                    logger.error("HTTPTransport.write error: %j", err);
                    errormsg = err;
                }
                else {
                    response = msg;
                    complete = true;
                }
                cb(null, complete);
            });
        }

        async.detectSeries(seeds, write, function (err, result) {
            // result now equals the first file in the list that exists
            if (!result && errormsg) {
                callback(errormsg);
            }
            else {
                callback(null, response);
            }
        });
    }

    ping(callback) {
        var data = {
            type: "ping"
        };
        var message = JSON.stringify(data);
        this.query(message, callback);
    }

    put(key, value, callback) {

        var data = {
            type: "dhtput",
            key: key,
            value: value
        };
        var message = JSON.stringify(data);

        this.query(message, (err, result) => {
            if (err) {
                return callback(err);
            }

            logger.debug("PUT for key " + key + " succeeded");

            callback(null, result);
        });
    }

    bcclient(reqBody, options, callback) {
        const cmd = JSON.stringify(reqBody);

        options.headers = {
            'streembit-bc-msg': 'true'
        };

        HTTPTransport.write(cmd, options, "/", function (err, response) {
            if (err) {
                callback(err)
            }

            callback(null, response);
        });
    }
}

module.exports = PeerClient;
