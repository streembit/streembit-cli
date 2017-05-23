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

const { EventEmitter } = require('events');
const { Transform: TransformStream } = require('stream');
const merge = require('merge');
const jsonrpc = require('jsonrpc-lite');
const uuid = require('uuid');


/**
 * Represents and duplex stream for dispatching messages to a given transport
 * adapter and receiving messages to process through middleware stacks
 * @class
 */
class Messenger extends EventEmitter {

  /**
   * @property {object} DEFAULTS - Default options for {@link Messenger}
   * @static
   * @memberof Messenger
   */
  static get DEFAULTS() {
    return {
      serializer: Messenger.JsonRpcSerializer,
      deserializer: Messenger.JsonRpcDeserializer
    };
  }

  /**
   * @function JsonRpcSerializer
   * @static
   * @memberof Messenger
   */
  static get JsonRpcSerializer() {
    return function([object, sender, receiver], callback) {
      let message = jsonrpc.parseObject(
        merge({ jsonrpc: '2.0', id: uuid() }, object)
      );
      let notification = jsonrpc.notification('IDENTIFY', sender);

      switch (message.type) {
        case 'request':
        case 'error':
        case 'success':
          return callback(null, [
            message.payload.id,
            Buffer.from(JSON.stringify([
              message.payload,
              notification
            ]), 'utf8'),
            receiver
          ]);
        case 'invalid':
        case 'notification':
        default:
          return callback(new Error(`Invalid message type "${message.type}"`));
      }
    }
  }

  /**
   * @function JsonRpcDeserializer
   * @static
   * @memberof Messenger
   */
  static get JsonRpcDeserializer() {
    return function(buffer, callback) {
      let [message, notification] = jsonrpc.parse(buffer.toString('utf8'));

      switch (message.type) {
        case 'request':
        case 'error':
        case 'success':
          return callback(null, [message, notification]);
        case 'invalid':
        case 'notification':
        default:
          return callback(new Error(`Invalid message type "${message.type}"`));
      }
    }
  }

  /**
   * @constructor
   * @param {object} [options]
   * @param {function} [options.serializer] - Serializer function
   * @param {function} [options.deserializer] - Deserializer function
   */
  constructor(options=Messenger.DEFAULTS) {
    super();

    this._opts = merge(Messenger.DEFAULTS, options);
    this.serializer = new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._serialize(object, cb)
    });
    this.deserializer = new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._deserialize(object, cb)
    });

    this.serializer.on('error', (err) => this.emit('error', err));
    this.deserializer.on('error', (err) => this.emit('error', err));
  }

  /**
   * Serializes a message to a buffer
   * @private
   */
  _serialize(object, callback) {
    this._opts.serializer(object, (err, data) => {
      callback(err, data);
    });
  }

  /**
   * Deserializes a buffer into a message
   * @private
   */
  _deserialize(object, callback) {
    if (!Buffer.isBuffer(object)) {
      return callback(new Error('Cannot deserialize non-buffer chunk'));
    }

    this._opts.deserializer(object, (err, data) => {
      callback(err, data);
    });
  }

}

module.exports = Messenger;
