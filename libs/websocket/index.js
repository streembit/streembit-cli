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

const constants = require("libs/constants");
const logger = require("libs/logger");
const events = require("libs/events");
const WebSocket = require('ws');

class WsServer {
    constructor(port) {
        this.port = port;
    }
 
    on_connection(ws) {
        try {
            ws.on('message', function incoming(message) {
                console.log('received: %s', message);
            });
        }
        catch (err) {
            logger.error("ws on_connection error: " + err.message);
        }
    }

    init() {
        try {

            logger.info("starting ws server");  
            
            const wsserver = new WebSocket.Server({ port: this.port });

            // set the connection handler
            wsserver.on('connection', this.on_connection);

            wsserver.on('close', function() {
                //cursor.goto(1, 4 + thisId).eraseLine();
                //console.log('Client #%d disconnected. %d files received.', thisId, filesReceived);
            });

            wsserver.on('error', function(e) {
                logger.error('ws error: %s', e.message);
            });

            //
        }
        catch (err) {
            logger.error("ws server init error: " + err.message);
        }
    }
}

module.exports = WsServer;

