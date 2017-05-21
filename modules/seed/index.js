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

const config = require("libs/config");
const logger = require("libs/logger");

//const crypto = require('crypto');
//const kad = require('libs/kad');

//const db = require("./libs/database");
//const transport = new kad.UDPTransport();
//const identity = kad.utils.getRandomKeyBuffer();
//const contact = { hostname: 'localhost', port: 1337 };

streembit.kad = (function (kadlib) {


}(streembit.kad || {}));


module.exports = exports = function (callback) {
    var conf = config.seed_config;
    if (!conf.run) {
        logger.debug("Don't run seed handler");
        return callback();
    }

    logger.info("Run seed handler");
    callback();
};