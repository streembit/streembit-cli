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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const logger = require("libs/logger");
const seedrunner = require("./seed");
const clientrunner = require("./client");
const config = require('libs/config');

class AppRunner {
    constructor() {
    }

    run(callback) {
        var seedconf = config.seed_config;
        var clientconf = config.client_config;
        if (!seedconf.run && !clientconf.run) {
            return callback("Invalid configuration. Seed or Client must run");
        }

        var runner = 0;
        var task = "";

        // either run the application as a seed or as a client
        if (seedconf.run) {
            runner = seedrunner;
            task = "Start Streembit seed";
        }
        else if (clientconf.run) {
            runner = clientrunner;
            task = "Start Streembit client";
        }

        runner(
            (err) => {
                if (err) {
                    logger.error(task + " error");
                }
                callback(err);
            }
        );
    }
}


module.exports = AppRunner;

