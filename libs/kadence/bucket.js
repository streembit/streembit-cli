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

import * as constants from './constants.js'
import * as utils from './utils.js'


/**
 * @typedef {array} Bucket~contact
 * @property {string} 0 - Node identity key
 * @property {object} 1 - Contact information (varies by plugins)
 */

/**
 * Represents a column of the routing table holding up to K contacts
 */
class Bucket extends Map {

    /**
     * @constructor
     */
    constructor() {
        super();
    }

    /**
     * @property {number} length - The number of contacts in the bucket
     */
    get length() {
        return super.size;
    }

    /**
     * @property {object} head - The contact at the bucket head
     */
    get head() {
        return [...super.entries()].shift();
    }

    /**
     * @property {object} tail - The contact at the bucket tail
     */
    get tail() {
        return [...super.entries()].pop();
    }

    /**
     * Sets the contact to the node ID in the bucket if it is not full; if the
     * bucket already contains the contact, move it to the tail - otherwise we
     * place it at the head
     * @param {string} nodeId - The identity key for the contact
     * @param {object} contact - The address information for the contact
     * @returns {number} index
     */
    set(nodeId, contact) {
        if (this.has(nodeId)) {
            super.delete(nodeId);
            super.set(nodeId, contact);
        } else if (this.size < constants.K) {
            let bucketEntries = [...this.entries()];

            super.clear();
            super.set(nodeId, contact);

            for (let [nodeId, contact] of bucketEntries) {
                super.set(nodeId, contact);
            }
        }

        return this.indexOf(nodeId);
    }

    /**
     * Returns the index of the given node id
     * @param {string} key - Node identity key for getting index
     * @returns {number}
     */
    indexOf(key) {
        let isMissing = -1;
        let index = isMissing;

        for (let nodeId of this.keys()) {
            index++;

            if (key !== nodeId) {
                continue;
            }

            return index;
        }

        return isMissing;
    }

    /**
     * Returns an array of contacts in the bucket that are closest to the given
     * key
     * @param {string|buffer} key - Reference key for finding other contacts
     * @returns {array}
     */
    getClosestToKey(key, count = constants.K) {
        let contacts = [];

        for (let [identity, contact] of this.entries()) {
            contacts.push({
                contact, identity, distance: utils.getDistance(identity, key)
            });
        }

        return new Map(contacts.sort((a, b) => {
            return utils.compareKeyBuffers(
                Buffer.from(a.distance, 'hex'),
                Buffer.from(b.distance, 'hex')
            );
        }).filter((result) => {
            return result.identity !== key.toString('hex');
        }).map((obj) => [obj.identity, obj.contact]).splice(0, count));
    }
}

export default Bucket;