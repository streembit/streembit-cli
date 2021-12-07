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

import assert from 'assert'
import * as utils from './utils.js'

/**
 * Represent kademlia protocol handlers
 */
class KademliaRules {

    /**
     * Constructs a kademlia rules instance in the context of a
     * {@link KademliaNode}
     * @constructor
     * @param {KademliaNode} node
     */
    constructor(node) {
        this.node = node;
    }

    /**
     * This RPC involves one node sending a PING message to another, which
     * presumably replies with a PONG. This has a two-fold effect: the
     * recipient of the PING must update the bucket corresponding to the
     * sender; and, if there is a reply, the sender must update the bucket
     * appropriate to the recipient.
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     */
    ping(request, response) {
        response.send([]);
    }

    /**
     * The sender of the STORE RPC provides a key and a block of data and
     * requires that the recipient store the data and make it available for
     * later retrieval by that key.
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     * @param {AbstractNode~next} next
     */
    store(request, response, next) {
        const [key, item] = request.params;
        let itemPayload = typeof item.value === 'object' ? item.value : item;

        try {
            if (itemPayload.type === 'Buffer') {
                itemPayload = JSON.parse(Buffer.from(itemPayload.data).toString('utf8'));
                if (typeof itemPayload === 'string') {
                    itemPayload = JSON.parse(itemPayload);
                }
            }

            if (typeof itemPayload === 'string') {
                itemPayload = JSON.parse(itemPayload);
            }

            this.node.logger.debug('KADEMLIA: STORE request for key:' +key+ ': %j', itemPayload);
            
            assert(typeof itemPayload === 'object',
                'Invalid storage item supplied');
            assert(typeof itemPayload.timestamp === 'number',
                'Invalid timestamp supplied');
            assert(utils.keyStringIsValid(itemPayload.publisher),
                'Invalid publisher identity supplied');
            assert(utils.keyStringIsValid(key),
                'Invalid item key supplied');
            assert(typeof itemPayload.value !== 'undefined',
                'Invalid item value supplied');
        } catch (err) {
            this.node.logger.error('KADEMLIA: STORE request validation failed, key:' +key+ ': %j', err);
            return next(err);
        }

        this.node.logger.debug('KADEMLIA: STORE request for key:' +key+ ': validation passed');

        itemPayload = JSON.stringify(itemPayload);
        this.node.storage.put(key, itemPayload, { valueEncoding: 'json' }, (err) => {
            if (err) {
                return next(err);
            }

            this.node.logger.debug('KADEMLIA: STORE sending back stored item', itemPayload);

            response.send([key, itemPayload]); // NB: Echo back what was stored
        });
    }

    /**
     * The FIND_NODE RPC includes a 160-bit key. The recipient of the RPC returns
     * up to K contacts that it knows to be closest to the key. The recipient
     * must return K contacts if at all possible. It may only return fewer than K
     * if it is returning all of the contacts that it has knowledge of.
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     * @param {AbstractNode~next} next
     */
    findNode(request, response, next) {
        const [key] = request.params;

        if (!utils.keyStringIsValid(key)) {
            return next(new Error('Invalid lookup key supplied'));
        }

        this.node.logger.debug(`FIND_NODE for key ${key}`);

        response.send([...this.node.router.getClosestContactsToKey(key).entries()]);
    }

    /**
     * A FIND_VALUE RPC includes a B=160-bit key. If a corresponding value is
     * present on the recipient, the associated data is returned. Otherwise the
     * RPC is equivalent to a FIND_NODE and a set of K contacts is returned.
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     * @param {AbstractNode~next} next
     */
    findValue(request, response, next) {
        const [key] = request.params;

        this.node.logger.info('KADEMLIA: FIND_VALUE request for key:' +key);

        if (!utils.keyStringIsValid(key)) {
            this.node.logger.error('KADEMLIA: FIND_VALUE error, for key:' +key+ ', error: invalid key');
            return next(new Error('Invalid lookup key supplied'));
        }

        this.node.storage.get(key, { valueEncoding: 'json' }, (err, item) => {
            if (err) {
                this.node.logger.error('KADEMLIA: FIND_VALUE error: %j', err);
                return this.findNode(request, response, next);
            }

            this.node.logger.debug('KADEMLIA: FIND_VALUE request for key:' +key+ ' succeeded', item);

            response.send(item);
        });
    }

}

export default KademliaRules;
