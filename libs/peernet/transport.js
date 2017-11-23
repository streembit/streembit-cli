/*

This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines.

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Zsolt Pardi
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const http = require("http");
const config = require("libs/config");
const constants = require("libs/constants");
const logger = require("streembit-util").logger;

let instance = null;

class PeerTransport{
    constructor() {
        if (!instance) {
            instance = this;
            this.pending = new Map();
            this.server = this.create_server();

            this.server.on('error', (err) => logger.error('PeerListener error %j', err));
            setInterval(() => this.timeout_pending(), constants.RESPONSETIMEOUT);

            this.agent = new http.Agent({ keepAlive: true, keepAliveMsecs: 25000 });
        }

        return instance;
    }

    create_server() {
        return http.createServer();
    }

    timeout_pending() {
        const now = Date.now();

        this.pending.forEach(({ timestamp, response }, id) => {
            let timeout = timestamp + constants.T_RESPONSETIMEOUT;

            if (now >= timeout) {
                response.statusCode = 504;
                response.end();
                this.pending.delete(id);
            }
        });
    }

    handle(req, re) {

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

    open(callback) {
        var host = config.host ? config.host : "localhost";
        this.server.on('request', (req, res) => this.handle(req, res));
        //this.server.listen(config.port, host, () => {
        this.server.listen(config.port, () => {
            logger.info('opened server on %s:%d', this.server.address().address, this.server.address().port);
            callback();
        });
    }


}

module.exports = PeerTransport