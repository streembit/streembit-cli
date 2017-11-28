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

const http = require('http');
const https = require('https');
const events = require("streembit-util").events;
const logger = require("streembit-util").logger;
const constants = require("libs/constants");

// create agents to enable http persistent connections:
var httpagent = new http.Agent({keepAlive: true, keepAliveMsecs: 25000});
var httpsagent = new https.Agent({keepAlive: true, keepAliveMsecs: 25000});

class HTTPTransport {

    constructor(options) {
        this.cors = options && !!options.cors;
        this.sslopts = options && options.ssl;
        this.protocol = this.sslopts ? https : http;
        this.agent = this.sslopts ? httpsagent : httpagent;
        this.server = 0;
        this.port = options.port || constants.DEFAULT_STREEMBIT_PORT ;
    }  

    create_server(handler) {
        return this._sslopts ?
            this.protocol.createServer(this.sslopts, handler) :
            this.protocol.createServer(handler);
    }

    add_crossorigin_headers (req, res) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    };


    init( done) {

        this.server = this.create_server(
            (req, res) => {
                var payload = '';
                var message = null;

                if (this.cors) {
                    this.add_crossorigin_headers(req, res);
                }

                if (req.method === 'OPTIONS') {
                    return res.end();
                }

                if (req.method !== 'POST') {
                    res.statusCode = 400;
                    return res.end();
                }

                req.on('error', function (err) {
                    logger.warn('remote client terminated early: %s', err.message);
                    self.receive(null);
                });

                req.on('data', function (chunk) {
                    payload += chunk.toString();
                });

                //request end
                req.on('end', function () {
                    try {
                        events.peermsg(payload, req, res);
                    }
                    catch (err) {
                        logger.error("HTTPTransport events.peermsg error: " + err.message);
                    }
                });
            }
        );

        this.server.on(
            'connection',
            (socket) => {
                // disable the tcp nagle algorithm on the newly accepted socket:
                socket.setNoDelay(true);
            }
        );

        this.server.listen(this.port, done);
    }

    close () {
        this.server.close();
    }

}


module.exports = HTTPTransport;
