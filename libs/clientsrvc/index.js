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
Author: Streembit team
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
*/

// 
//  Client service module
//  Handles client request that are normally recieved via the HTTP transport
//  such as the request to get the list of WS peers
//

'use strict';

import { logger } from 'streembit-util';
import { config } from '../config/index.js';
import { AppInfo as appinfo } from '../appinfo/index.js';

class ClientSrvc {
    constructor() {
    }

    static getwsinfo() {
        try {
            var wsport = 0;
            if (config.transport && config.transport.ws && config.transport.ws.port) {
                wsport = config.transport.ws.port;
            }

            var clientcount = appinfo.wsclientcount;
            var available = appinfo.wsavailable;

            var result = { wsport: wsport, clientcount: clientcount, available: available };
            return result;
        }
        catch (err) {
            logger.error("ClientSrvc getwsinfo() error: " + err.message);
        }
    }

    //  TODO: work out how the distributed WS handler list will work ...
    //  The nodes of the Kademlia network must maintain the list of WS peers
    //  For now just send one item in the array, the WS handler of this application (in case it is available)
    //  Need to work out how to populate the distributed list of WS handlers
    static getwspeers() {
        try {
            var wspeers = [];
            var available = appinfo.wsavailable;
            if (available) {
                var wshost = config.transport.host;
                var wsport = config.transport.ws.port;                
                var clientcount = appinfo.wsclientcount;
                wspeers.push(
                    {
                        wshost: wshost,
                        wsport: wsport,
                        clientcount: clientcount,
                        available: available
                    }
                );
            }

            var result = { wspeers: wspeers};
            return result;
        }
        catch (err) {
            logger.error("ClientSrvc getwsinfo() error: " + err.message);
        }
    }
}


export default ClientSrvc;
