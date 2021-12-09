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

import assert from 'assert';

import clarinet from 'clarinet';
import net from 'net';
import { StreembitContact } from '../contacts/streembit-contact.js';
import { RPC } from '../rpc.js';
import { Message } from '../message.js';


/**
 * Transport adapter that sends and receives messages over a TCP socket
 * @constructor
 * @extends {RPC}
 * @param {StreembitContact} contact - Your node's {@link Contact} instance
 */

export class TCPTransport extends RPC {

    constructor(contact, options) {
        super(contact, options);
        if (!(this instanceof TCPTransport)) {
            return new TCPTransport(contact, options);
        }

        assert(contact instanceof StreembitContact, 'Invalid contact supplied');
        assert(typeof contact.host === 'string' && contact.host.length > 0, 'Invalid host was supplied');
        assert(typeof contact.port === 'number' && contact.port > 0, 'Invalid port was supplied');

        RPC.call(this, contact, options);
        this.on('MESSAGE_DROP', this._handleDroppedMessage.bind(this));
    }

    /**
     * Create a TCP socket and listen for messages
     * @private
     * @param {Function} done
     */
    _open(done) {
        const self = this;

        this._socket = net.createServer(this._handleConnection.bind(this));
        this._queuedResponses = {};

        this._socket.on('error', (err) => {
            self._log.error('rpc encountered and error: %s', err.message);
        });

        this._socket.on('listening', done);
        this._socket.listen(this._contact.port);
    };

    /**
     * Send a RPC to the given contact
     * @private
     * @param {Buffer} data
     * @param {Contact} contact
     */
    _send(data, contact) {
        const self = this;
        const parsed = JSON.parse(data.toString());

        if (this._queuedResponses[parsed.id]) {
            this._queuedResponses[parsed.id].end(data);
            delete this._queuedResponses[parsed.id];
            return;
        }

        if (!contact.valid()) {
            this._log.warn('Refusing to send message to invalid contact');
            return this.receive(null);
        }

        const sock = net.createConnection(contact.port, contact.host);

        sock.on('error', (err) => {
            //self._log.error('error connecting to peer: ' + err.message);
        });

        this._queuedResponses[parsed.id] = sock;

        this._handleConnection(sock);
        sock.write(data);
    };

    /**
     * Close the underlying socket
     * @private
     */
    _close() {
        this._socket.close();
    };

    /**
     * Handle incoming connection
     * @private
     * @param {Object} connection
     */
    _handleConnection(connection) {

        const self = this;

        const parser = clarinet.createStream();
        let buffer = '';
        let opened = 0;
        let closed = 0;

        const handleInvalidMsg = () => {
            buffer = '';
            opened = 0;
            closed = 0;
            // TODO list on the blacklist
        }

        parser.on('openobject', () => {
            opened++;
        });

        parser.on('closeobject', () => {
            closed++;

            if (opened === closed) {
                let parsed;
                try {
                    parsed = JSON.parse(buffer);
                } catch (err) {
                    return handleInvalidMsg();
                }

                if (!parsed) {
                    return handleInvalidMsg();
                }

                try {
                    if (parsed.type) {
                        const addr = connection.remoteAddress;
                        switch (parsed.type) {
                            case "DISCOVERY":
                                self._log.debug('DISCOVERY message');
                                const reply = JSON.stringify({ address: addr });
                                connection.write(reply);
                                connection.end();
                                break;

                            case "PEERMSG":
                                const port = connection.remotePort;
                                self.emit('PEERMSG', parsed, { host: addr, port: port });
                                break;

                            default:
                                handleInvalidMsg();
                                connection.end();
                                break;
                        }
                    } else {
                        // all other messages
                        if (parsed.id && !self._queuedResponses[parsed.id]) {
                            self._queuedResponses[parsed.id] = connection;
                        }

                        self.receive(Buffer.from(buffer), connection);
                    }
                } catch (e) {
                    self._log.error('TCP handleConnection error: %j', e);
                    connection.end();
                }

                buffer = '';
                opened = 0;
                closed = 0;
            }
        });

        parser.on('error', (err) => {
            self._log.error(err.message);
            self._log.warn('failed to parse incoming message');
            connection.end();
        });

        connection.on('error', (err) => {
            //var clientaddr = connection.remoteAddress + ":" + connection.remotePort;
            //self._log.error('error communicating with peer ' + clientaddr + ' error: ' + err.message);
        });

        connection.on('data', (data) => {
            buffer += data.toString('utf8');
            parser.write(data.toString('utf8'));
        });
    };

    _handleDroppedMessage(buffer) {
        let message;

        try {
            message = Message.fromBuffer(buffer);
        } catch (err) {
            this._log.error('_handleDroppedMessage Message error: ' + err.message);
            return false;
        }

        try {
            if (this._queuedResponses[message.id]) {
                this._queuedResponses[message.id].end();
                delete this._queuedResponses[message.id];
            }
        } catch (err) {
            this._log.error('_handleDroppedMessage _queuedResponses error: ' + err.message);
        }

        return true;
    };
}


