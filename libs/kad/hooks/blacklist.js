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

/**
 * Factory for blacklist middleware
 * @param {Array} blacklist - array of nodeID's to ban
 * @returns {Function}
 */
const BlacklistFactory = (blacklist) => {
  assert(Array.isArray(blacklist), 'Invalid blacklist supplied');

  return function blacklister(message, contact, next) {
    if (blacklist.indexOf(contact.nodeID) !== -1) {
      return next(new Error('Contact is in the blacklist'));
    }

    next();
  };
};

module.exports = BlacklistFactory;
