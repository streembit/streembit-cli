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
Copyright (C) 2016 The Streembit software development team
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


import { events } from 'events';
import assert from 'assert';
import async from 'async';
import { Contact } from './contact.js';

import { constants } from './constants.js';
import { Message } from './message.js';
import { Logger } from './logger.js';


/**
 * Represents an RPC interface
 * @constructor
 * @param {Contact} contact - Your node's {@link Contact} information
 * @param {Object} options
 * @param {Contact} options.replyto - Optional alternate public contact
 * @param {Logger} options.logger - Logger instance to use
 * @property {Number} readyState - Closed: 0, Transitioning: 1, Open: 2
 */

/**
 * Triggered when the underlying transport is open
 * @event RPC#ready
 */

/**
 * Triggered when a contact is seen
 * @event RPC#CONTACT_SEEN
 * @param {Contact} contact - The contact that was just encountered
 */

/**
 * Triggered when a RPC message times out
 * @event RPC#TIMEOUT
 * @param {Contact} contact - The contact that did not respond
 * @param {Message} message - The message sent that timed out
 */

/**
 * Triggered when a FIND_NODE RPC is received
 * @event RPC#FIND_NODE
 * @param {Message} message - The message received
 */

/**
 * Triggered when a FIND_VALUE RPC message is received
 * @event RPC#FIND_VALUE
 * @param {Message} message - The message received
 */

/**
 * Triggered when a PING RPC message is received
 * @event RPC#PING
 * @param {Message} message - The message received
 */

/**
 * Triggered when a STORE RPC message is received
 * @event RPC#STORE
 * @param {Message} message - The message received
 */

/**
 * Triggered when an invalid RPC message is dropped
 * @event RPC#MESSAGE_DROP
 * @param {Buffer} message - The raw invalid message received
 */


export class RPC extends events.EventEmitter {
    constructor(contact, options = {}) {
        super();
        assert(this instanceof RPC, 'Invalid instance supplied');
        assert(contact instanceof Contact, 'Invalid contact was supplied');

        if (options.replyto) {
            assert(options.replyto instanceof Contact, 'Invalid contact was supplied');
        }

        this._hooks = { before: {}, after: {} };
        this._pendingCalls = {};
        this._contact = options.replyto || contact;
        this._log = (options && options.logger) || new Logger(0);
        this.readyState = 0;

        this.open();
    }

    /**
     * Opens the underlying transport
     * @emits RPC#ready
     * @param {RPC~openCallback} callback - Called when the transport is opened
     */
    open(callback) {
        let self = this;

        if (callback) {
            self.once('ready', callback);
        }

        self.readyState = 1;

        self._trigger('before:open', [], () => {
            self._open(() => {
                self.readyState = 2;
                self.emit('ready');
                self._trigger('after:open');
            });

            self._expirator = setInterval(
                self._expireCalls.bind(self),
                constants.T_RESPONSETIMEOUT + 5
            );
        });
    };

    /**
     * Closes the underlying transport
     * @param {RPC~closeCallback} callback - Called when the transport is closed
     */
    close(callback) {
        let self = this;

        self.readyState = 1;

        self._trigger('before:close', [], () => {
            self._close();
            self.readyState = 0;
            self._trigger('after:close');
            clearInterval(self._expirator);

            if (callback) {
                callback();
            }
        });
    };

    /**
     * Send a RPC to the given contact
     * @param {Contact} contact - Delivery target for message
     * @param {Message} message - Message to send to target
     * @param {RPC~sendCallback} callback - Response handler function
     */
    send(contact, message, callback) {
        let self = this;

        contact = self._createContact(contact);

        assert(contact instanceof Contact, 'Invalid contact supplied');
        assert(message instanceof Message, 'Invalid message supplied');

        if (Message.isRequest(message)) {
            this._log.debug('sending %s message to %j', message.method, contact);
        } else {
            this._log.debug('replying to message to %s', message.id);
        }

        this._trigger('before:serialize', [message], () => {
            var serialized = message.serialize();

            self._trigger('after:serialize');
            self._trigger('before:send', [serialized, contact], () => {
                if (Message.isRequest(message) && typeof callback === 'function') {
                    self._log.debug('queuing callback for reponse to %s', message.id);

                    self._pendingCalls[message.id] = {
                        timestamp: Date.now(),
                        callback: callback,
                        contact: contact,
                        message: message
                    };
                } else {
                    self._log.debug('not waiting on callback for message %s', message.id);
                }

                self._send(message.serialize(), contact);
                self._trigger('after:send');
            });
        });
    };

    /**
     * Handle incoming messages
     * @param {Buffer} buffer - Raw binary data to be processed by the RPC handler
     */
    receive(buffer) {
        let self = this, message, contact;

        const deserialize = () => {
            message = Message.fromBuffer(buffer);

            self._trigger('after:deserialize');

            if (Message.isRequest(message)) {
                contact = self._createContact(message.params.contact);
            } else {
                contact = self._createContact(message.result.contact);
            }

            self._log.debug('received valid message from %j', contact);
        }

        if (!buffer) {
            self._log.debug('missing or empty reply from contact');
            return self.emit('MESSAGE_DROP');
        }

        this._trigger('before:deserialize', [buffer], () => {
            try {
                deserialize();
            } catch (err) {
                self._log.error('failed to handle message, reason: %s', err.message);
                return self.emit('MESSAGE_DROP', buffer);
            }

            self.emit('CONTACT_SEEN', contact);
            self._trigger('before:receive', [message, contact], (err) => {
                if (err) {
                    return self.emit('MESSAGE_DROP', buffer);
                }

                self._execPendingCallback(message, contact);
            });
        });
    };


    /**
     * Registers a "before" hook
     * @param {String} event - Name of the event to catch
     * @param {Function} handler - Event handler to register
     */
    before(event, handler) {
        return this._register('before', event, handler);
    };

    /**
     * Registers an "after" hook
     * @param {String} event - Name of the event to catch
     * @param {Function} handler - Event handler to register
     */
    after(event, handler) {
        return this._register('after', event, handler);
    };

    /**
     * Registers a middleware or "hook" in a set
     * @private
     * @param {String} time - One of "before" or "after"
     * @param {String} event - Name of the event to catch
     * @param {Function} handler - Event handler to register
     */
    _register(time, event, handler) {
        assert(Object.keys(this._hooks).indexOf(time) !== -1, 'Invalid hook');
        assert(typeof event === 'string', 'Invalid event supplied');
        assert(typeof handler === 'function', 'Invalid handler supplied');

        if (!this._hooks[time][event]) {
            this._hooks[time][event] = [];
        }

        this._hooks[time][event].push(handler);

        return this;
    };

    /**
     * Triggers a middleware or "hook" set
     * @private
     * @param {String} event -  Name of the event to trigger
     * @param {Array} args - Arguments to pass to event handlers
     * @param {Function} callback - Fired after all events are triggered
     */
    _trigger(event, args, complete) {
        let self = this;
        var hook = event.split(':')[0];
        var name = event.split(':')[1];
        var callback = complete || function () { };

        if (!this._hooks[hook][name]) {
            return callback();
        }

        var stack = this._hooks[hook][name].map((fn) => {
            return fn.bind.apply(fn, [self].concat(args || []));
        });

        async.series(stack, (err) => {
            if (err) {
                return callback(err);
            }

            callback();
        });
    };

    /**
     * Create a contact object from the supplied contact information
     * @private
     * @param {Object} options - Data to be passed to the transport's
     * {@link Contact} constructor
     */
    _createContact(options) {
        return new this._contact.constructor(options);
    };


    /**
     * Executes the pending callback for a given message
     * @private
     * @param {Message} message - Message to handle any callbacks for
     * @param {Contact} contact - Contact who sent the message
     */
    _execPendingCallback(message) {
        let pendingCall = this._pendingCalls[message.id];

        //this._log.debug('checking pending rpc callback stack for %s', message.id);

        if (Message.isResponse(message) && pendingCall) {
            pendingCall.callback(null, message);
            delete this._pendingCalls[message.id];
        } else if (Message.isRequest(message)) {
            if (constants.MESSAGE_TYPES.indexOf(message.method) === -1) {
                this.emit('MESSAGE_DROP', message.serialize());
                this._log.warn(
                    'message references unsupported method %s',
                    message.method
                );
            } else {
                this.emit(message.method, message);
            }
        } else {
            this.emit('MESSAGE_DROP', message.serialize());
            this._log.warn('dropping received late response to %s', message.id);
        }

        this._trigger('after:receive', []);
    };

    /**
     * Expire RPCs that have not received a reply
     * @private
     */
    _expireCalls() {
        //this._log.debug('checking pending rpc callbacks for expirations');

        for (let rpcID in this._pendingCalls) {
            let pendingCall = this._pendingCalls[rpcID];
            let timePassed = Date.now() - pendingCall.timestamp;

            if (timePassed > constants.T_RESPONSETIMEOUT) {
                this._log.warn('rpc call %s timed out', rpcID);
                this.emit('TIMEOUT', pendingCall.contact, pendingCall.message);
                pendingCall.callback(new Error('RPC with ID `' + rpcID + '` timed out'));
                delete this._pendingCalls[rpcID];
            }
        }
    };

    /**
     * Unimplemented stub, called on close()
     * @abstract
     */
    _close() {
        throw new Error('Method not implemented');
    };

    /**
     * Unimplemented stub, called on send()
     * @abstract
     * @param {Buffer} data - Raw binary data to send
     * @param {Contact} contact - Target peer to send data
     */
    _send() {
        throw new Error('Method not implemented');
    };

    /**
     * Unimplemented stub, called on constructor
     * @abstract
     */
    _open(done) {
        setImmediate(done);
    };

}


