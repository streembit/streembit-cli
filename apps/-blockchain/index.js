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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


import { config } from "../../libs/config";
import { logger } from "streembit-util";

import { Blockchain } from "./bc";

export class BlockchainHandler {
    constructor() {
    }

    run(callback) {
        try {
            let conf = config.blockchain_config;
            if (!conf.run) {
                logger.info("Config blockchain handler -> not running");
                return callback();
            }

            logger.info("Run blockchain handler");

            let bc = new Blockchain();
            bc.init(callback);

            //
        }
        catch (err) {
            logger.error("Blockchain handler error: " + err.message);
        }
    }
}


