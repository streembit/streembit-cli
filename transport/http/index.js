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
Copyright (C) 2018 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------  
*/

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const events = require("streembit-util").events;
const logger = require("streembit-util").logger;
const constants = require("libs/constants");
const config = require("libs/config");
const ClientRequestHandler = require("./clihandler");

// create agents to enable http persistent connections:
var httpagent = new http.Agent({keepAlive: true, keepAliveMsecs: 25000});
var httpsagent = new https.Agent({keepAlive: true, keepAliveMsecs: 25000});

let messageid = 0;
const HTTPTIMEOUT = 15000;

class HTTPTransport {

    constructor(options) {
        this.cors = options && !!options.cors;
        this.sslopts = options && options.ssl ? options.ssl : 0;
        this.protocol = config.transport.ssl ? https : http;
        this.agent = config.transport.ssl ? httpsagent : httpagent;
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
        if (config.transport.ssl) {
            const options = {
                key: fs.readFileSync(config.transport.key),
                cert: fs.readFileSync(config.transport.cert)
            };
            if (config.transport.ca) {
                options.ca = fs.readFileSync(config.transport.ca);
            }
            return https.createServer(options, handler);
        }
        else {
            return http.createServer(handler);
        }
    }

    static add_crossorigin_headers (req, res) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    };

    static iskadmsg(message) {
        // KAD messages don't have a type field, other messages must have a string type field
        var iskad = !(message && message.type && typeof message.type == "string");
        return iskad;
    }

    // 
    // route the message
    // 
    static routemsg(payload, req, res) {
        try {
            //console.log(payload);
            if (!res || !res.end) {
                return logger.error("HTTPTransport routemsg error: invalid res object");
            }

            if (!payload) {
                // return a success status for the GET request
                // GET request is only fro health check
                if (req.method === 'GET') {
                    res.statusCode = 200;
                    return res.end();
                }

                // for POST method the payload must exists
                throw new Error("invalid payload");
            }

            var message;
            try {
                message = JSON.parse(payload);
            }
            catch (err) {
            }
            

            if (HTTPTransport.iskadmsg(message)) {
                // this message will be picked up by the KAD HTTP transport which listens on this event
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
            else {        
                // for POST method must be a valid message when it is a client (not KAD) message
                if (!message) {
                    throw new Error("invalid message");
                }

                // this is a client request, the HTTP client request handler will get it
                var data = {
                    req: req,
                    res: res,
                    message: message
                };
                events.emit(constants.ONCLIENTREQUEST, data);
            }
        }
        catch (err) {
            // bad request
            try {
                res.statusCode = 405;
                res.end();
            }
            catch (e){ }
            logger.error("HTTPTransport routemsg error: " + err.message);
        }
    }

    handler(req, res) {
        try {
            var payload = '';
            var message = null;

            HTTPTransport.add_crossorigin_headers(req, res);

            if (req.method === 'OPTIONS') {
                return res.end();
            }

            req.on('error', function (err) {
                logger.error('Http transport server error: %', err.message);
            });

            req.on('data', function (chunk) {
                payload += chunk.toString();
            });

            //request end
            req.on('end', () => {
                HTTPTransport.routemsg(payload, req, res);
            });
        }
        catch (err) {
            logger.error('Http transport handler error: %', err.message);
        }
    }

    static write(message, target, action, callback) {
        try {

            logger.debug("peer transport write");

            if (!message  || typeof message != "string") {
                return callback("http write data must be string");
            }

            if (!action) {
                action = '/';
            }

            var handleResponse = function handleResponse(res) {
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
                path: action,
                port: target.port,
                method: 'POST'
            };

            var isssl = config.transport.ssl;
            if (target.protocol == "http" ){
                isssl = false;
            }

            var req;
            if (isssl) {
                options.strictSSL = false;
                options.rejectUnauthorized = false;
                logger.debug("HTTPS.request to " + target.host + ":" + target.port );
                req = https.request(options, handleResponse);
            }
            else {
                logger.debug("http.request to " + target.host + ":" + target.port);
                req = http.request(options, handleResponse);
            }

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
        try {
            this.server = this.create_server(this.handler);

            this.server.on(
                'connection',
                (socket) => {
                    // disable the tcp nagle algorithm on the newly accepted socket:
                    socket.setNoDelay(true);
                }
            );

            this.server.listen(this.port, () => {
                var protocol = config.transport.ssl ? "HTTPS" : "HTTP";
                logger.info(protocol + ' transport listening on port ' + this.port);
                this.islistening = true;
                done();
            });

            var clihandler = new ClientRequestHandler();
            clihandler.on_request();

            //
        }
        catch (err) {
            done(err);
        }
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
