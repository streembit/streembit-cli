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

Based on
 * @module kadence
 * @license AGPL-3.0
 * @author Gordon Hall https://github.com/bookchin
-------------------------------------------------------------------------------------------------------------------------
*/

'use strict';

const HTTPTransport = require('./transport-http');
const https = require('https');
const merge = require('merge');

/**
 * Extends the HTTP transport with SSL
 */
class HTTPSTransport extends HTTPTransport {

    static get DEFAULTS() {
        return {};
    }

    /**
     * Contructs a new HTTPS transport adapter
     * @constructor
     * @extends {HTTPTransport}
     * @param {object} options
     * @param {buffer} options.key - SSL private key buffer
     * @param {buffer} options.cert - SSL certificate buffer
     * @param {buffer[]} options.ca - List of certificate authority certificates
     */
    constructor(options) {
        super(merge({}, HTTPSTransport.DEFAULTS, options));
    }

    /**
     * Constructs the HTTPS server
     * @private
     */
    _createServer() {
        return https.createServer(...arguments);
    }

    /**
     * Constructs the HTTPS request
     * @private
     */
    _createRequest() {
        return https.request(...arguments);
    }

}

module.exports = HTTPSTransport;
