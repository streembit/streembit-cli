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

class PeerListener{
    constructor() {
        this.pending = new Map();
        this.server = this.create_server();

        this.server.on('error', (err) => this.emit('error', err));
        setInterval(() => this.timeout_pending(), constants.RESPONSETIMEOUT);
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

    listen() {
        this.server.listen(config.port);
    }
}

module.exports = PeerListener