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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
*/

'use strict';

const constants = require("libs/constants");
const config = require("libs/config");
const logger = require("streembit-util").logger;
const WebSocket = require('ws');
const IoTWsHandler = require('./handler_iot');
const SrvcWsHandler = require('./handler_srvc');

class WsServer {
    constructor(port, max_connections) {
        this.port = port;
        this.max_connections = max_connections || 100000;   
        this.wsmode = config.wsmode;
        this.handler = null;
    }

    processmsg(ws, request) {
        try {
            this.handler.processmsg(ws, request);
        }
        catch (err) {
            logger.error("WS processmsg error %j", errmsg)   
        }
    }
 
    on_connection(ws) {
        try {         
            ws.on('message', (message) => {
                this.processmsg(ws, message);
            });
        }
        catch (err) {
            logger.error("WS on_connection error: " + err.message);
        }
    }


    handler_factory() {
        var obj;
        if (this.wsmode == constants.WSMODE_SRVC) {
            obj = new SrvcWsHandler();
        }
        else if (this.wsmode == constants.WSMODE_IOT) {
            obj = new IoTWsHandler();
        }
        else {
            throw new Error(this.wsmode + " WS handler is not implemented");
        }

        // must implement the on_send and processmsg funcitons
        if (!obj || !obj.on_send || !obj.processmsg) {
            throw new Error(this.wsmode + " invalid WS handler");
        }

        return obj;
    }

    init(callback) {
        try {

            if (this.wsmode == constants.WSMODE_NONE) {
                logger.info("Not starting WS server");                
                return callback();
            }

            logger.info("Starting WS, wsmode: " + this.wsmode);  

            // must create the handler, the type of handler depends on the WS mode
            this.handler = this.handler_factory();
            
            const wsserver = new WebSocket.Server(
                {
                    port: this.port
                }
            );

            // set the connection handler
            wsserver.on('connection', (ws) => {
                try {             
                    //console.log("ws client connected");
                    ws.on('message', (message) => {
                        this.processmsg(ws, message);
                    });
                    //
                }
                catch (err) {
                    logger.error("ws on_connection error: " + err.message);
                }
            });

            wsserver.on('close', function() {
                //TODO signal the app that the server was closed
                logger.info("Web socket server was closed");
            });

            wsserver.on('error', function(e) {
                logger.error('ws error: %s', e.message);
            });

            wsserver.on('listening', (e) => {
                logger.info('WS is listening on port ' + this.port);
            });

            // listen to messages from any modules of the application to the client
            this.handler.on_send();

            callback();

            //
        }
        catch (err) {
            callback("WS server init error: " + err.message);
        }
    }
}

module.exports = WsServer;

