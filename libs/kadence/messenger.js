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

import { EventEmitter } from 'events'
import merge from 'merge'
import MetaPipe from 'metapipe'
import { Transform as TransformStream } from 'stream'

// const { EventEmitter } = require('events');
// const { Transform: TransformStream } = require('stream');
// const merge = require('merge');
// const jsonrpc = require('jsonrpc-lite');
// const uuid = require('uuid');
// const MetaPipe = require('metapipe');


/**
 * Represents and duplex stream for dispatching messages to a given transport
 * adapter and receiving messages to process through middleware stacks
 * @class
 */
class Messenger extends EventEmitter {

    static get DEFAULTS() {
        return {
            serializer: Messenger.JsonRpcSerializer,
            deserializer: Messenger.JsonRpcDeserializer
        };
    }

    /**
     * @function
     * @memberof Messenger
     * @param {array} data - Object to transform
     * @param {object} data.0 - JSON payload, parsed into an object
     * @param {Bucket~contact} sender - Origin peer for message
     * @param {Bucket~contact} receiver - Destination peer for message
     * @param {function} callback - Transform stream callback(err, data)
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
     * @function
     * @memberof Messenger
     * @param {buffer} rawMessage - Incoming message as buffer
     * @param {function} callback - Transform stream callback(err, data)
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
     * @interface Messenger~serializer
     * @function
     * @param {object|buffer} data - Outgoing message buffer or parsed JSON data
     * @param {string|null} encoding - Encoding of incoming data
     * @param {Messenger~serializerCallback} callback
     */

    /**
     * @callback Messenger~serializerCallback
     * @param {error|null} error
     * @param {buffer|object} data - Serialized data to pass through middleware
     */

    /**
     * @interface Messenger~deserializer
     * @function
     * @param {object|buffer} data - Incoming message buffer or parsed JSON data
     * @param {string|null} encoding - Encoding of incoming data
     * @param {Messenger~deserializerCallback} callback
     */

    /**
     * @callback Messenger~deserializerCallback
     * @param {error|null} error
     * @param {buffer|object} data - Deserialized data to pass through middleware
     */

    /**
     * @constructor
     * @param {object} [options]
     * @param {Messenger~serializer} [options.serializer] - Serializer function
     * @param {Messenger~deserializer} [options.deserializer] - Deserializer function
     */
    constructor(options = Messenger.DEFAULTS) {
        super();

        this._opts = merge(Messenger.DEFAULTS, options);
        this.serializer = new MetaPipe({ objectMode: true });
        this.deserializer = new MetaPipe({ objectMode: true });

        this.serializer.append(new TransformStream({
            objectMode: true,
            transform: (object, enc, cb) => this._serialize(object, cb)
        }));
        this.deserializer.append(new TransformStream({
            objectMode: true,
            transform: (object, enc, cb) => this._deserialize(object, cb)
        }));

        this.serializer.on('error', (err) => this.emit('error', err));
        this.deserializer.on('error', (err) => this.emit('error', err));
    }

    /**
     * Serializes a message to a buffer
     * @private
     */
    _serialize(object, callback) {
        this._opts.serializer(object, (err, data) => {
            callback(null, err ? undefined : data);
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
            callback(null, err ? undefined : data);
        });
    }

}

export default Messenger;
// module.exports = Messenger;