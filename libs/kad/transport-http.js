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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
  
*/

/**
 * Implementation is based on https://github.com/kadtools/kad 
 * Huge thanks to Gordon Hall https://github.com/gordonwritescode the author of kad library!
 * @module kad
 * @license GPL-3.0
 * @author Gordon Hall gordon@gordonwritescode.com
 */

'use strict';

const http = require('http');
const { Duplex: DuplexStream } = require('stream');
const merge = require('merge');
const concat = require('concat-stream');
const constants = require('./constants');


/**
 * Represents a transport adapter over HTTP
 */
class HTTPTransport extends DuplexStream {

  static get DEFAULTS() {
    return {};
  }

  /**
   * Contructs a HTTP transport adapter
   * @constructor
   * @param {object} [options]
   */
  constructor(options) {
    super({ objectMode: true });

    this._options = merge({}, HTTPTransport.DEFAULTS, options);
    this._pending = new Map();
    this.server = this._createServer(this._options);

    this.server.on('error', (err) => this.emit('error', err));
    setInterval(() => this._timeoutPending(), constants.T_RESPONSETIMEOUT);
  }

  /**
   * Creates the HTTP server object
   * @private
   */
  _createServer() {
    return http.createServer();
  }

  /**
   * Returns a HTTP request object
   * @private
   */
  _createRequest() {
    return http.request(...arguments);
  }

  /**
   * Implements the readable interface
   * @private
   */
  _read() {
    if (this.server.listeners('request').length) {
      return;
    }

    this.server.on('request', (req, res) => this._handle(req, res));
  }

  /**
   * Every T_RESPONSETIMEOUT, we destroy any open sockets that are still
   * waiting
   * @private
   */
  _timeoutPending() {
    const now = Date.now();

    this._pending.forEach(({ timestamp, response }, id) => {
      let timeout = timestamp + constants.T_RESPONSETIMEOUT;

      if (now >= timeout) {
        response.statusCode = 504;
        response.end();
        this._pending.delete(id);
      }
    });
  }

  /**
   * Implements the writable interface
   * @private
   */
  _write([id, buffer, target], encoding, callback) {
    let [, contact] = target;

    // NB: If responding to a received request...
    if (this._pending.has(id)) {
      this._pending.get(id).response.end(buffer);
      this._pending.delete(id);
      return callback(null);
    }

    // NB: If originating an outbound request...
    const request = this._createRequest({
      hostname: contact.hostname,
      port: contact.port,
      protocol: contact.protocol,
      method: 'POST',
      headers: {
        'x-kad-message-id': id
      }
    });

    request.on('response', (response) => {
      response
        .on('error', (err) => this.emit('error', err))
        .pipe(concat((buffer) => this.push(buffer)));
    });

    request.on('error', (err) => this.emit('error', err));
    request.end(buffer);

    callback();
  }

  /**
   * Default request handler
   * @private
   */
  _handle(req, res) {
    req.on('error', (err) => this.emit('error', err));
    res.on('error', (err) => this.emit('error', err));

    if (!req.headers['x-kad-message-id']) {
      res.statusCode = 400;
      return res.end();
    }

    res.setHeader('X-Kad-Message-ID', req.headers['x-kad-message-id']);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (!['POST', 'OPTIONS'].includes(req.method)) {
      res.statusCode = 405;
    }

    if (req.method !== 'POST') {
      return res.end();
    }

    req.pipe(concat((buffer) => {
      this._pending.set(req.headers['x-kad-message-id'], {
        timestamp: Date.now(),
        response: res
      });
      this.push(buffer);
    }));
  }

  /**
   * Binds the server to the given address/port
   */
  listen() {
    this.server.listen(...arguments);
  }

}

module.exports = HTTPTransport;
