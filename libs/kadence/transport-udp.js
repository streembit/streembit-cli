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

import merge from "merge";
import { Duplex as DuplexStream } from "stream";
import dgram from "dgram";

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
    this.socket = dgram.createSocket(merge(UDPTransport.DEFAULTS, options))
      .on('error', (err) => this.emit('error', err));
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
   * @param {number} [port=0] - Port to bind to
   * @param {string} [address=0.0.0.0] - Address to bind to
   * @param {function} [callback] - called after bind complete
   */
  listen() {
    this.socket.bind(...arguments);
  }

}

export default UDPTransport;
