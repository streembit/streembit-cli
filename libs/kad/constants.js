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


/**
 * @module kad/constants
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
exports.T_RESPONSETIMEOUT = 10000;
