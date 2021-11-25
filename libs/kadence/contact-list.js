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

import * as utils from './utils.js';

/**
 * Manages contact lists returned from FIND_NODE queries
 */
export class ContactList {

    /**
     * @constructor
     * @param {string} key - Lookup key for this operation
     * @param {Bucket~contact[]} contacts - List of contacts to initialize with
     */
    constructor(key, contacts = []) {
        this.key = key;
        this._contacts = [];
        this._contacted = new Set();
        this._active = new Set();

        this.add(contacts);
    }

    /**
     * @property {Bucket~contact} closest - The contact closest to the reference key
     */
    get closest() {
        return this._contacts[0];
    }

    /**
     * @property {Bucket~contact[]} active - Contacts in the list that are active
     */
    get active() {
        return this._contacts.filter(contact => this._active.has(contact[0]));
    }

    /**
     * @property {Bucket~contact[]} uncontacted - Contacts in the list that have not been
     * contacted
     */
    get uncontacted() {
        return this._contacts.filter(contact => !this._contacted.has(contact[0]));
    }

    /**
     * Adds the given contacts to the list
     * @param {Bucket~contact[]} contacts
     */
    add(contacts) {
        let identities = this._contacts.map(c => c[0]);
        let added = [];

        contacts.forEach(contact => {
            if (identities.indexOf(contact[0]) === -1) {
                this._contacts.push(contact);
                identities.push(contact[0]);
                added.push(contact);
            }
        });

        this._contacts.sort(this._identitySort.bind(this));

        return added;
    }

    /**
     * Marks the supplied contact as contacted
     * @param {Bucket~contact} contact
     */
    contacted(contact) {
        this._contacted.add(contact[0]);
    }

    /**
     * Marks the supplied contact as active
     * @param {Bucket~contact} contact
     */
    responded(contact) {
        this._active.add(contact[0]);
    }

    /**
     * @private
     */
    _identitySort([aIdentity], [bIdentity]) {
        return utils.compareKeyBuffers(
            Buffer.from(utils.getDistance(aIdentity, this.key), 'hex'),
            Buffer.from(utils.getDistance(bIdentity, this.key), 'hex')
        );
    }

}

