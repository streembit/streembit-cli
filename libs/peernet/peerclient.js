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

import async from 'async';
import { logger } from 'streembit-util';
import { config } from '../../libs/config/index.js';
import HTTPTransport from '../../transport/http/index.js'
import * as utils from '../../libs/utils/index.js';

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
        const seeds = utils.shuffle(config.seeds);

        let response = null;
        let errormsg = null;

        const write = (seed, cb) => {
            seed.protocol = seed.protocol || protocol;
            HTTPTransport.write(message, seed, "/", (err, msg) => {
                let complete = false;
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

        async.detectSeries(seeds, write, (err, result) => {
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
        const data = {
            type: "ping"
        };
        const message = JSON.stringify(data);
        this.query(message, callback);
    }

    put(key, value, callback) {
        const data = {
            type: "dhtput",
            key: key,
            value: value
        };
        const message = JSON.stringify(data);

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

        HTTPTransport.write(cmd, options, "/", (err, response) => {
            if (err) {
                callback(err)
            }

            callback(null, response);
        });
    }
}

export default PeerClient;
