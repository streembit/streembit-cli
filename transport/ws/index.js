﻿/*
 
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

'use strict';

import https from "https";
import fs from "fs";
import { constants } from "../../libs/constants/index.js";
import { config } from "../../libs/config/index.js";
import { logger } from "streembit-util";
import { WebSocketServer } from 'ws';
import { AppInfo as appinfo } from "../../libs/appinfo/index.js"
import { SrvcWsHandler } from "./handler_srvc.js";
import { IoTWsHandler } from "./handler_iot.js";

export class WsServer {
    constructor(port, max_connections) {
        if (!port || !max_connections) {
            throw new Error("invalid WsServer start parameters")
        }

        this.port = port;
        this.max_connections = max_connections;
        // update the appinfo maxconn
        appinfo.wsmaxconn = this.max_connections;

        this.wsmode = config.wsmode;
        this.handler = null;
        this.wsserver = null;
    }

    processmsg(ws, request) {
        try {
            this.handler.processmsg(ws, request);
        }
        catch (err) {
            logger.error("WS processmsg error %j", errmsg)
        }
    }


    handler_factory() {
        let obj;
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

    canconnect() {
        let count = 0;
        if (this.wsserver.clients && this.wsserver.clients.size) {
            count = this.wsserver.clients.size;
        }
        return count < this.max_connections;
    }

    removeclient(ws) {
        try {
            // update the AppInfo
            appinfo.wsclientcount = this.wsserver.clients.size;

            const token = (ws && ws.clienttoken) ? ws.clienttoken : "";
            if (!token) {
                // the clienttoken must exist to identify the socket
                return;
            }

            let pkhash;
            for (let [key, value] of this.handler.list_of_sessions) {
                if (value.token == ws.clienttoken) {
                    pkhash = key;
                }
            }

            if (pkhash) {
                this.handler.list_of_sessions.delete(pkhash);
                logger.debug("ws client removed token: " + token);
            }

            //
        }
        catch (err) {
            logger.error("WS removeclient error: %j", err);
        }
    }

    monitor() {
        setInterval(
            () => {
                if (!this.wsserver || !this.wsserver.clients || this.wsserver.clients.size == 0) {
                    return;
                }

                this.wsserver.clients.forEach(
                    (ws) => {
                        if (ws.isAlive === false) {
                            try {
                                ws.terminate();
                            }
                            catch (err) { }
                            try {
                                this.removeclient(ws);
                            }
                            catch (err) { }
                            // update the AppInfo
                            appinfo.wsclientcount = this.wsserver.clients.size;
                            logger.debug("inactive WS client removed");
                        }
                        else {
                            ws.isAlive = false;
                            ws.ping(() => { });
                        }
                    }
                );
            },
            30000);
    }

    async init() {
        try {

            if (this.wsmode == constants.WSMODE_NONE) {
                logger.info("Not starting WS server");
                return true;
            }

            logger.info("Starting WS, wsmode: " + this.wsmode);

            // must create the handler, the type of handler depends on the WS mode
            this.handler = this.handler_factory();

            if (config.transport.ssl) {
                const options = {
                    key: fs.readFileSync(config.transport.key),
                    cert: fs.readFileSync(config.transport.cert)
                };
                if (config.transport.ca) {
                    options.ca = fs.readFileSync(config.transport.ca);
                }

                const server = https.createServer(options);
                this.wsserver = new WebSocketServer({ server });
                server.listen(this.port, () => {
                    logger.info("HTTPS server for WS handler is listening on port " + this.port);
                });
            } else {
                this.wsserver = new WebSocketServer({ port: this.port });
            }


            // set the connection handler
            this.wsserver.on('connection', (ws) => {
                try {
                    // upon connection set the AppInfo wsclientcount variable
                    appinfo.wsclientcount = this.wsserver.clients.size;

                    const available = this.canconnect();
                    appinfo.wsavailable = available;
                    if (!available) {
                        // close the connection and don't setup the event handlers
                        return ws.terminate();
                    }

                    ws.on('message', (message) => {
                        this.processmsg(ws, message);
                    });

                    ws.on('close', () => {
                        this.removeclient(ws);
                    });

                    ws.on('error', () => {
                        this.removeclient(ws);
                    });

                    ws.on('pong', () => {
                        this.isAlive = true;
                    });
                }
                catch (err) {
                    logger.error("ws on_connection error: " + err.message);
                }
            });

            this.wsserver.on('close', () => {
                //TODO signal the app that the server was closed
                logger.info("Web socket server was closed");
            });

            this.wsserver.on('error', (e) => {
                logger.error('ws error: %s', e.message);
            });

            this.wsserver.on('listening', (e) => {
                logger.info('WS is listening on port ' + this.port);
            });

            // listen to messages from any modules of the application to the client
            this.handler.on_send();

            // start the monitor
            this.monitor();

            appinfo.wsavailable = true;

            return true;

            //
        }
        catch (err) {
            throw new Error(`WS server init error:  ${err.message}`);
        }
    }
}
