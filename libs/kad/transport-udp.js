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

const merge = require('merge');
const { Duplex: DuplexStream } = require('stream');
const dgram = require('dgram');


/**
 * Implements a UDP transport adapter
 */
class UDPTransport extends DuplexStream {

  static get DEFAULTS() {
    return {
      type: 'udp4',
      reuseAddr: false
    };
  }

  /**
   * Constructs a datagram socket interface
   * @constructor
   * @param {object} [socketOpts] - Passed to dgram.createSocket(options)
   */
  constructor(options) {

      super({ objectMode: true });

      this.m_log = 0;

      if (options && options.logger) {
          this.logger = options.logger;
      }

      this.socket = dgram.createSocket(merge(UDPTransport.DEFAULTS, options))
        .on('error', (err) => this.error_handler(err));

  }


  get logger() {
      return this.m_log;
  }

  set logger(l) {
      this.m_log = l;
  }

  error_handler(err) {
      this.emit('error', err);
  }

  /**
   * Implements the writable interface
   * @private
   */
  _write([id, buffer, target], encoding, callback) {
    let [, contact] = target;

    this.socket.send(buffer, 0, buffer.length, contact.port, contact.hostname,
                     callback);
  }

  /**
   * Implements the readable interface
   * @private
   */
  _read() {
    this.socket.once('message', (buffer) => {
      this.push(buffer);
    });
  }

  /**
   * Binds the socket to the [port] [, address] [, callback]
   * @param {number} [port=0]
   * @param {string} [address=0.0.0.0]
   * @param {function} [callback]
   */
  listen() {

      this.socket.on('listening', () => {
          var address = this.socket.address();
          this.logger.info('server listening %s:%d', address.address, address.port);
      });

      //console.dir(...arguments);
      this.socket.bind(...arguments);

  }

}

module.exports = UDPTransport;
