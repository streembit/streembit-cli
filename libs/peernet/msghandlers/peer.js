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

const logger = require("streembit-util").logger;
const kad = require("libs/peernet/kad");
const msgvalidator = require("libs/peernet/msghandlers/msg_validator");

function put(message, callback) {
    logger.debug("PUT for peer");

    msgvalidator.validate(message, function (e) {
        if (e) {
            return callback(e);
        }

        var key = message.key;
        var value = message.value;
        var kadnet = new kad.KadHandler();
        kadnet.put(key, value, (err) => callback(err));
    });    
}

module.exports = (msg, callback) => {

    try {
        switch (msg.type) {
            case "PUT":
                put(msg, callback);
                break;
            default:
                return callback("Invalid message type");
        }
    }
    catch (err) {
        callback("peer msg handler error, " + err.message);
    }
};

