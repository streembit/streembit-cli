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

import * as utils from './utils.js'

/**
 * The base class from which custom contacts inherit; used by the included
 * {link StreembitContact}. Nodes provide each other with contact
 * information which indicates how others should communicate with them.
 * @constructor
 * @param {Object} options
 * @param {String} options.nodeID - Optional known 160 bit node ID
 */


export class Contact {

    constructor(options) {
        if (!(this instanceof Contact)) {
            return new Contact(options);
        }
        this.nodeID = options.nodeID;

        assert(typeof options === 'object', 'Invalid options were supplied');



        assert(utils.isValidKey(this.nodeID), 'Invalid nodeID was supplied');

        this.seen();
    }

    /**
     * Updates the lastSeen property to right now
     */
    seen() {
        this.lastSeen = Date.now();
    };

    /**
     * Validator function for determining if contact is okay
     * @abstract
     * @returns {Boolean}
     */
    valid() {
        return true;
    };


    /**
     * Unimplemented stub, called when no nodeID is passed to constructor.
     * @private
     * @abstract
     */

    createNodeID() {
        throw new Error('Method not implemented');
    };

}


