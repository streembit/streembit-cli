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

import { EventEmitter } from "events";
import * as constants from "./constants.js";
import * as utils from "./utils.js";
import Bucket from "./bucket.js";

/**
 * Represents a kademlia routing table
 */
class RoutingTable extends Map {

    /**
     * Constructs a routing table
     * @constructor
     * @param {buffer} identity - Reference point for calculating distances
     */
    constructor(identity) {
        super();

        this.identity = identity || utils.getRandomKeyBuffer();
        this.events = new EventEmitter();

        for (let b = 0; b < constants.B; b++) {
            this.set(b, new Bucket());
        }
    }

    /**
     * Returns the total contacts in the routing table
     * @property {number} size
     */
    get size() {
        let contacts = 0;
        this.forEach((bucket) => contacts += bucket.length);
        return contacts;
    }

    /**
     * Returns the total buckets in the routing table
     * @property {number} length
     */
    get length() {
        let buckets = 0;
        this.forEach(() => buckets++);
        return buckets;
    }

    /**
     * Returns the bucket index of the given node id
     * @param {string|buffer} nodeId - Node identity to get index for
     * @returns {number}
     */
    indexOf(nodeId) {
        return utils.getBucketIndex(this.identity, nodeId);
    }

    /**
     * Returns the contact object associated with the given node id
     * @param {string|buffer} nodeId - Node identity of the contact
     * @returns {Bucket~contact}
     */
    getContactByNodeId(nodeId) {
        nodeId = nodeId.toString('hex');

        return this.get(this.indexOf(nodeId)).get(nodeId);
    }

    /**
     * Removes the contact from the routing table given a node id
     * @param {string|buffer} nodeId - Node identity to remove
     * @return {boolean}
     */
    removeContactByNodeId(nodeId) {
        nodeId = nodeId.toString('hex');

        this.events.emit('remove', nodeId);
        return this.get(this.indexOf(nodeId)).delete(nodeId);
    }

    /**
     * Adds the contact to the routing table in the proper bucket position,
     * returning the [bucketIndex, bucket, contactIndex, contact]; if the
     * returned contactIndex is -1, it indicates the bucket is full and the
     * contact was not added; kademlia implementations should PING the contact
     * at bucket.head to determine if it should be dropped before calling this
     * method again
     * @param {string|buffer} nodeId - Node identity to add
     * @param {object} contact - contact information for peer
     * @returns {array}
     */
    addContactByNodeId(nodeId, contact) {
        nodeId = nodeId.toString('hex');

        const bucketIndex = this.indexOf(nodeId);
        const bucket = this.get(bucketIndex);
        const contactIndex = bucket.set(nodeId, contact);

        this.events.emit('add', nodeId);
        return [bucketIndex, bucket, contactIndex, contact];
    }

    /**
     * Returns the [index, bucket] of the occupied bucket with the lowest index
     * @returns {Bucket}
     */
    getClosestBucket() {
        for (let [index, bucket] of this) {
            if (index < constants.B - 1 && bucket.length === 0) {
                continue;
            }
            return [index, bucket];
        }
    }

    /**
     * Returns a array of N contacts closest to the supplied key
     * @param {string|buffer} key - Key to get buckets for
     * @param {number} [n=20] - Number of results to return
     * @returns {map}
     */
    getClosestContactsToKey(key, n = constants.K) {
        const bucketIndex = this.indexOf(key);
        const contactResults = new Map();

        function _addNearestFromBucket(bucket) {
            let entries = [...bucket.getClosestToKey(key).entries()];

            entries.splice(0, n - contactResults.size)
                .forEach(([id, contact]) => {
                    /* istanbul ignore else */
                    if (contactResults.size < n) {
                        contactResults.set(id, contact);
                    }
                });
        }

        let ascIndex = bucketIndex;
        let descIndex = bucketIndex;

        _addNearestFromBucket(this.get(bucketIndex));

        while (contactResults.size < n && descIndex >= 0) {
            _addNearestFromBucket(this.get(descIndex--));
        }

        while (contactResults.size < n && ascIndex < constants.B) {
            _addNearestFromBucket(this.get(ascIndex++));
        }

        return contactResults;
    }

}

export default RoutingTable;
