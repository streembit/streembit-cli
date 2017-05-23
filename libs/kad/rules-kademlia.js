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

const assert = require('assert');
const utils = require('./utils');


/**
 * Represent kademlia protocol handlers
 * @class
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
   * @param {object} request
   * @param {object} response
   */
  ping(request, response) {
    response.send([]);
  }

  /**
   * The sender of the STORE RPC provides a key and a block of data and
   * requires that the recipient store the data and make it available for
   * later retrieval by that key.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  store(request, response, next) {
    const [key, item] = request.params;

    try {
      assert(typeof item === 'object',
             'Invalid storage item supplied');
      assert(typeof item.timestamp === 'number',
             'Invalid timestamp supplied');
      assert(utils.keyStringIsValid(item.publisher),
             'Invalid publisher identity supplied');
      assert(utils.keyStringIsValid(key),
             'Invalid item key supplied');
      assert(typeof item.value !== 'undefined',
             'Invalid item value supplied');
    } catch (err) {
      return next(err);
    }

    this.node.storage.put(key, item, { valueEncoding: 'json' }, (err) => {
      if (err) {
        return next(err);
      }

      response.send([key, item]); // NB: Echo back what was stored
    });
  }

  /**
   * The FIND_NODE RPC includes a 160-bit key. The recipient of the RPC returns
   * up to K contacts that it knows to be closest to the key. The recipient
   * must return K contacts if at all possible. It may only return fewer than K
   * if it is returning all of the contacts that it has knowledge of.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  findNode(request, response, next) {
    const [key] = request.params;

    if (!utils.keyStringIsValid(key)) {
      return next(new Error('Invalid lookup key supplied'));
    }

    response.send([...this.node.router.getClosestContactsToKey(key).entries()]);
  }

  /**
   * A FIND_VALUE RPC includes a B=160-bit key. If a corresponding value is
   * present on the recipient, the associated data is returned. Otherwise the
   * RPC is equivalent to a FIND_NODE and a set of K contacts is returned.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  findValue(request, response, next) {
    const [key] = request.params;

    if (!utils.keyStringIsValid(key)) {
      return next(new Error('Invalid lookup key supplied'));
    }

    this.node.storage.get(key, { valueEncoding: 'json' }, (err, item) => {
      if (err) {
        return this.findNode(request, response, next);
      }

      response.send(item);
    });
  }

}

module.exports = KademliaRules;
