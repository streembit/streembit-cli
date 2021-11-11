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

var assert = require('assert');
var Contact = require('../contact');
var utils = require('../utils');



/**
 * Represent a contact (or peer)
 * @constructor
 * @extends {Contact}
 * @param {Object} options
 * @param {String} options.host - IP or hostname
 * @param {Number} options.port - Listening port
 * @param {Number} options.publickey - Contacts public key
 */

class StreembitContact extends Contact {

    constructor(options) {
        let str;

        if (options.publickey) {
            assert(typeof options.publickey === 'string', 'Invalid public key was supplied');
            str = options.publickey.trim();


            assert(str.length <= 128, 'Invalid public key was supplied');

        }
        options.nodeID = options.nodeID || options.publickey;
        super(options);

        if (!(this instanceof StreembitContact)) {
            return new StreembitContact(options);
        }


        assert(typeof options === 'object', 'Invalid options were supplied: options != object');
        assert(typeof options.host === 'string', 'Invalid host was supplied options.host != string');
        assert(typeof options.port === 'number', 'Invalid port was supplied options.port != number');

        this.publickey = "";
        this.host = options.host;
        this.port = options.port;
        this.isseed = options.isseed ? false : true;
        this.publickey = str;


    }

    /**
    * Generate a NodeID by taking the SHA1 hash of the host and port
    */

    createNodeID() {
        return utils.createID(this.toString());
    };

    /**
    * Generate a user-friendly string for the contact
    */
    toString() {

        return this.publickey;
    };


}

/*const  stc = new StreembitContact({
   host:'sdfdsfdsfds',
   port:8080,
   nodeID:"986ac27d21b009f6ad2660b7586841afc889b145",
   publickey: '5454545454534545454545454545454545345454545454545454545453454545454545454545454534545454545454545454545'
});
*/
module.exports = StreembitContact;

