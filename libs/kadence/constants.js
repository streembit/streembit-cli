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

Based on kadence library https://github.com/kadence author Gordon Hall https://github.com/bookchin
-------------------------------------------------------------------------------------------------------------------------
*/


/**
 * @module kadence/constants
 */

'use strict';

/**
 * @constant {number} ALPHA - Degree of parallelism
 */
exports.ALPHA = 3;

/**
 * @constant {number} B - Number of bits for nodeID creation
 */
exports.B = 160;

/**
 * @constant {number} K - Number of contacts held in a bucket
 */
exports.K = 20;

/**
 * @constant {number} T_REFRESH - Interval for performing router refresh
 */
exports.T_REFRESH = 3600000;

/**
 * @constant {number} T_REPLICATE - Interval for replicating local data
 */
exports.T_REPLICATE = 3600000;

/**
 * @constant {number} T_REPUBLISH - Interval for republishing data
 */
exports.T_REPUBLISH = 86400000;

/**
 * @constant {number} T_EXPIRE - Interval for expiring local data entries
 */
exports.T_EXPIRE = 86405000;

/**
 * @constant {number} T_RESPONSETIMEOUT - Time to wait for RPC response
 */
exports.T_RESPONSETIMEOUT = 5000;

/**
 * @constant {string} HD_KEY_DERIVATION_PATH - Key derivation path for HD key
 */
exports.HD_KEY_DERIVATION_PATH = 'm/5273/0';

/**
 * @constant {number} SOLUTION_DIFFICULTY - Number of leading 0 value bits
 */
exports.SOLUTION_DIFFICULTY = 20;

/**
 * @constant {number} IDENTITY_DIFFICULTY - Number of leading 0 value bits
 */
exports.IDENTITY_DIFFICULTY = 16;

/**
 * @constant {number} SOLUTION_MAX_CONFIDENCE - Max number of validations
 */
exports.SOLUTION_MAX_CONFIDENCE = 20;

/**
 * @constant {number} MAX_NODE_INDEX - Maximum valid derivation index
 */
exports.MAX_NODE_INDEX = (Math.pow(2, 31) - 1);

/**
 * @constant {number} LRU_CACHE_SIZE - Number of used hashcash stamps to track
 */
exports.LRU_CACHE_SIZE = 50;

/**
 * @constant {number} FILTER_DEPTH - Number of neighborhood hops to track
 * subsrciptions for
 */
exports.FILTER_DEPTH = 3;

/**
 * @constant {number} MAX_RELAY_HOPS - Maximum times a message instance will be
 * relayed when published
 */
exports.MAX_RELAY_HOPS = 6;

/**
 * @constant {number} SOFT_STATE_TIMEOUT - Time to wait before busting the
 * subscription cache
 */
exports.SOFT_STATE_TIMEOUT = 3600000;
