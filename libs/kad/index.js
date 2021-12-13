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
import async from 'async';
import { Bucket } from './bucket.js';
import { Contact } from './contact.js';
import { Message } from './message.js';
import { Node } from './node.js';
import { Router } from './router.js';
import { RPC } from './rpc.js';
import * as contacts from './contacts/index.js';
import * as trasports from './transports.js';
import * as hooks from './hooks.js';
import * as utils from './utils.js';
import { constants } from './constants.js';
export {
    // {@link Bucket} */
    Bucket,
    // {@link Contact} */
    Contact,
    // {@link Message} 
    Message,
    /*// {@link Node} */
    Node,
    // {@link Router} */
    Router,
    /*/ {@link RPC} */
    RPC,
    contacts,
    trasports,
    hooks,
    utils,
    constants


}















/*
 *  Creates the node
 *  Connects to the seeds by interating the seeds array
 *  Returns the peer object
 */



export const create = function (options, callback) {

    if (!options.logger || !options.logger.error || !options.logger.info || !options.logger.warn || !options.logger.debug) {
        throw new Error("alogger that implements the error, info, warn and debug methods must be passed to the node");
    }

    let transport = options.transport;
    let seeds = options.seeds;

    //  create the node
    let peer = new Node(options);

    if (!seeds || seeds.length == 0) {
        options.logger.warn("there are no seeds defined, the node is not connected to any seeds");
        // There are no seeds, this must be the very first partcicipant of the Streembit network
        return callback(null, peer);
    }

    if (!Array.isArray(seeds)) {
        //  must be an array   
        throw new Error("the seeds must be an array");
    }

    async.mapSeries(
        seeds,
        function (seed, done) {
            let result = { seed: seed, error: null };
            try {
                peer.connect(seed, function (err) {
                    if (err) {
                        result.error = err;
                        return done(null, result);
                    }

                    let contact = peer._rpc._createContact(seed);
                    peer._router.findNode(contact.nodeID, function (err) {
                        result.error = err;
                        done(null, result);
                    });
                });
            }
            catch (e) {
                options.logger.error("peer.connect error: %j", e);
                result.error = e;
                done(null, result);
            }
        },
        function (err, results) {
            if (err || results.length == 0) {
                return callback("Failed to connect to any seed", peer);
            }

            let seed_success_count = 0;
            results.forEach(function (item, index, array) {
                if (item.seed && !item.error) {
                    seed_success_count++;
                    options.logger.debug("seed connected: %j", item.seed);
                }
            });

            if (!seed_success_count) {
                err = "Failed to connect to any seed";
            }

            callback(err, peer);
        }
    );

};


export const create_node = function (options) {


    if (!options.logger || !options.logger.error || !options.logger.info || !options.logger.warn || !options.logger.debug) {
        throw new Error("alogger that implements the error, info, warn and debug methods must be passed to the node");
    }

    let transport = options.transport;
    let seeds = options.seeds;

    if (!seeds || !Array.isArray(seeds) || seeds.length == 0) {
        //  must be an array   
        throw new Error("seeds are required");
    }

    if (!transport) {
        //  must be an array   
        throw new Error("transport is required");
    }

    //  create the node
    let peernode = new Node(options);
    return peernode;
};