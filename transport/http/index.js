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
const constants = require("../../libs/constants");


// create agents to enable http persistent connections:
var httpagent = new http.Agent({keepAlive: true, keepAliveMsecs: 25000});
var httpsagent = new https.Agent({keepAlive: true, keepAliveMsecs: 25000});

let messageid = 0;
const HTTPTIMEOUT = 15000;

class HTTPTransport {

    constructor(options) {
        this.cors = options && !!options.cors;
        this.sslopts = options && options.ssl ? options.ssl : 0;
        this.protocol = this.sslopts ? https : http;
        this.agent = this.sslopts ? httpsagent : httpagent;
        this.server = 0;
        this.port = options.port || constants.DEFAULT_STREEMBIT_PORT;
        this.islistening = false;
        this.max_connections = options.max_connections || 250; 
    }  

    static get newid() {
        if (messageid > 100000) {
            messageid = 0;
        }
        messageid += 1;
        return messageid;
    }

    create_server(handler) {
        return this.sslopts ?
            this.protocol.createServer(this.sslopts, handler) :
            this.protocol.createServer(handler);
    }

    add_crossorigin_headers (req, res) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    };

    handler(req, res) {
        try {
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
                logger.error('Http transport server error: %', err.message);
            });

            req.on('data', function (chunk) {
                payload += chunk.toString();
            });

            //request end
            req.on('end', ()=> {
                try {
                    ////console.log(payload);
                    var msgid = HTTPTransport.newid; 
                    events.peermsg(
                        payload,
                        req,
                        res,
                        msgid,
                        (id, replymsg) => {
                            // TODO handle here the completion of the message
                            // if the response object is not closed return status 200
                        }
                    );
                }
                catch (err) {
                    logger.error("HTTPTransport events.peermsg error: " + err.message);
                }
            });
        }
        catch (err) {
            logger.error('Http transport handler error: %', err.message);
        }
    }

    write(message, target, callback) {
        try {

            logger.debug("peer transport write");

            if (!message  || typeof message != "string") {
                return callback("http write data must be string");
            }

            function handleResponse(res) {
                var payload = '';
                var status = res.statusCode;
                var statusmsg = res.statusMessage;

                res.on('data', function (chunk) {
                    payload += chunk.toString();
                });

                res.on('error', function (err) {                    
                    callback(err);
                });

                res.on('end', function () {  
                    if (status != 200) {
                        callback(status + " " + statusmsg);
                    }
                    else {
                        callback(null, payload);
                    }
                });
            }            

            var options = {
                host: target.host,
                path: '/',
                port: target.port,
                method: 'POST'
            };

            var req = http.request(options, handleResponse);

            req.setNoDelay(true); // disable the tcp nagle algorithm

            req.on('error', function (err) {
                callback(err);
            });

            req.write(message);
            req.end();        

            //
        }
        catch (err) {
            callback(err);
        }
    }

    init(done) {
        this.server = this.create_server(this.handler);

        this.server.on(
            'connection',
            (socket) => {
                // disable the tcp nagle algorithm on the newly accepted socket:
                socket.setNoDelay(true);
            }
        );

        this.server.listen(this.port, () => {
            logger.info('Http transport listening on port ' + this.port);
            this.islistening = true;
            done();
        });
    }

    close(callback) {
        logger.info('Http transport close');
        this.server.close();
        if (callback) {
            callback();
        }
    }

}


module.exports = HTTPTransport;
