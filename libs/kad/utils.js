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
/**
* @module kad/utils
*/

'use strict';

import assert from 'assert';
import crypto from 'crypto'
import { constants } from './constants.js';


/**
 * Validate a key
 * @param {String} key - Key to test
 * @returns {Boolean}
 */
export const isValidKey = (key) => {
    return !!key && key.length === constants.B / 4;
};


/**
 * Returns a random valid key/identity as a string
 * @returns {string}
 */
exports.getRandomKeyString = function () {
    return exports.getRandomKeyBuffer().toString('hex');
};

/**
 * Returns a random valid key/identity as a buffer
 * @returns {buffer}
 */
exports.getRandomKeyBuffer = function () {
    return crypto.randomBytes(constants.B / 8);
};


/**
 * Create a valid ID from the given string
 * @param {String|Buffer} data - Data to SHA1 hash
 * @returns {String}
 */
export const createID = (data) => {
    //if (exports.isValidKey(data)) {
    //    return data;
    //}

    //return crypto.createHash('sha1').update(data).digest('hex');
    return crypto.createHash('rmd160').update(data).digest('hex');
};

/**
 * Convert a key to a buffer
 * @param {String} hexString
 * @returns {Buffer}
 */
export const hexToBuffer = (hexString) => {
    var buf = Buffer.from(hexString, 'hex');
    return buf;
};

/**
 * Calculate the distance between two keys
 * @param {String} key1
 * @param {String} key2
 * @returns {Number}
 */
export const getDistance = (id1, id2) => {
    assert(isValidKey(id1), 'Invalid key supplied');
    assert(isValidKey(id2), 'Invalid key supplied');

    var distance = Buffer.alloc(constants.B / 8);
    var id1Buf = hexToBuffer(id1);
    var id2Buf = hexToBuffer(id2);

    for (let i = 0; i < constants.B / 8; ++i) {
        distance[i] = id1Buf[i] ^ id2Buf[i];
    }

    return distance;
};

/**
 * Compare two buffers for sorting
 * @param {Buffer} b1
 * @param {Buffer} b2
 * @returns {Number}
 */
export const compareKeys = (b1, b2) => {
    assert.equal(b1.length, b2.length);

    for (let i = 0; i < b1.length; ++i) {
        if (b1[i] !== b2[i]) {
            if (b1[i] < b2[i]) {
                return -1;
            } else {
                return 1;
            }
        }
    }

    return 0;
};

/**
 * Calculate the index of the bucket that key would belong to
 * @param {String} id1
 * @param {String} id2
 * @returns {Number}
 */
export const getBucketIndex = (id1, id2) => {
    assert(isValidKey(id1), 'Invalid key supplied');
    assert(isValidKey(id2), 'Invalid key supplied');

    var distance = getDistance(id1, id2);
    var bucketNum = constants.B;

    for (let i = 0; i < distance.length; i++) {
        if (distance[i] === 0) {
            bucketNum -= 8;
            continue;
        }

        for (let j = 0; j < 8; j++) {
            if (distance[i] & (0x80 >> j)) {
                return --bucketNum;
            } else {
                bucketNum--;
            }
        }
    }

    return bucketNum;
};

/**
 * @private
 * @param {Number} exp
 * @returns {Buffer}
 */
export const getPowerOfTwoBuffer = (exp) => {
    assert.ok(exp >= 0 && exp < constants.B);

    var buffer = Buffer.alloc(constants.K);
    var byte = parseInt(exp / 8);

    // we set the byte containing the bit to the right left shifted amount
    buffer.fill(0);
    buffer[constants.K - byte - 1] = 1 << (exp % 8);

    return buffer;
};

/**
 * Assuming index corresponds to power of 2
 * (index = n has nodes within distance 2^n <= distance < 2^(n+1))
 * @param {Number} index
 */
export const getRandomInBucketRangeBuffer = (index) => {
    var base = getPowerOfTwoBuffer(index);
    var byte = parseInt(index / 8); // randomize bytes below the power of two

    for (let i = constants.K - 1; i > (constants.K - byte - 1); i--) {
        base[i] = parseInt(Math.random() * 256);
    }

    // also randomize the bits below the number in that byte
    // and remember arrays are off by 1
    for (let j = index - 1; j >= byte * 8; j--) {
        let one = Math.random() >= 0.5;
        let shiftAmount = j - byte * 8;

        base[constants.K - byte - 1] |= one ? (1 << shiftAmount) : 0;
    }

    return base;
};