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
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------  
*/

'use strict';


const events = require("streembit-util").events;
const logger = require("streembit-util").logger;
const util = require("util");

class DiscoverySrvc {

    constructor() {
    }

    init() {
        events.register(
            events.ONPEERMSG,
            (payload, req, res) => {
                try {
                    var message = JSON.parse(payload);
                    if (message && message.type && message.type == "DISCOVERY") {
                        var ipaddress = req.connection.remoteAddress;
                        var reply = JSON.stringify({ address: ipaddress });
                        res.end(reply);
                    }
                }
                catch (err) {
                    logger.error("DiscoverySrvc service error %j", err)
                }
            }
        );   
    }

    close() {
    }

}


module.exports = DiscoverySrvc;
