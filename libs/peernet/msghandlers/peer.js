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

import { logger } from 'streembit-util';
import { KadHandler } from '../kad.js';
import * as msgvalidator from './msg_validator.js';

const kad = new KadHandler();

export const dhtget = (message, callback) => {
    logger.debug("get value for peer");
    const key = message.key;
    const kadnet = new kad.KadHandler();
    kadnet.get(key, callback);
}

const dhtput = (message, callback) => {
    logger.debug("PUT for peer");

    msgvalidator.validate(message, (e) => {
        if (e) {
            return callback(e);
        }

        const key = message.key;
        const value = message.value;
        const kadnet = new kad.KadHandler();
        kadnet.put(key, value, (err) => callback(err));
    });    
}

export default (msg, callback) => {
    try {
        switch (msg.type) {
            case "PUT":
                dhtput(msg, callback);
                break;
            default:
                return callback("Invalid message type");
        }
    }
    catch (err) {
        callback("peer msg handler error, " + err.message);
    }
};
