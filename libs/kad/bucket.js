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


import * as _ from 'lodash';
import assert from 'assert';
import { constants } from './constants.js';
import { Contact } from './contact.js';


/**
* A bucket is a "column" of the routing table. It is an array-like object that
* holds {@link Contact}s.
* @constructor
*/

export class Bucket {

    constructor() {
        if (!(this instanceof Bucket)) {
            return new Bucket();
        }

        this._contacts = [];
    }

    /**
     * Return the number of contacts in this bucket
     * @returns {Number}
     */
    getSize() {
        return this._contacts.length;
    };

    /**
     * Return the list of contacts in this bucket
     * @returns {Array}
     */
    getContactList() {
        return _.clone(this._contacts);
    };

    /**
     * Return the contact at the given index
     * @param {Number} index - Index of contact in bucket
     * @returns {Contact|null}
     */
    getContact(index) {
        assert(index >= 0, 'Contact index cannot be negative');

        return this._contacts[index] || null;
    };

    /**
     * Adds the contact to the bucket
     * @param {Contact} contact - Contact instance to add to bucket
     * @returns {Boolean} added - Indicates whether or not the contact was added
     */
    addContact(contact) {
        assert(contact instanceof Contact, 'Invalid contact supplied');

        if (this.getSize() === constants.K) {
            return false;
        }

        if (!this.hasContact(contact.nodeID)) {
            let index = _.sortedIndex(this._contacts, contact, function (contact) {
                return contact.lastSeen;
            });

            this._contacts.splice(index, 0, contact);
        }

        return true;
    };

    /**
     * Returns boolean indicating that the nodeID is contained in the bucket
     * @param {String} nodeID - 160 bit node ID
     * @returns {Boolean}
     */
    hasContact(nodeID) {
        for (let i = 0; i < this.getSize(); i++) {
            if (this._contacts[i].nodeID === nodeID) {
                return true;
            }
        }

        return false;
    };


    /**
     * Removes the contact from the bucket
     * @param {Contact} contact - Contact instance to remove from bucket
     * @returns {Boolean} removed - Indicates whether or not the contact was removed
     */
    removeContact(contact) {
        let index = this.indexOf(contact);

        if (index >= 0) {
            this._contacts.splice(index, 1);
            return true;
        }

        return false;
    };
    /**
     * Returns the index of the given contact
     * @param {Contact} contact - Contact instance for index check
     * @returns {Number}
     */
    indexOf(contact) {
        assert(contact instanceof Contact, 'Invalid contact supplied');

        for (let i = 0; i < this.getSize(); i++) {
            if (this.getContact(i).nodeID === contact.nodeID) {
                return i;
            }
        }

        return -1;
    };


}




