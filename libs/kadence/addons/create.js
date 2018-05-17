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

const async = require('async');
const config = require("libs/config");
const kad = require('libs/kadence');

/*
 *  Creates the node
 *  Connects to the seeds by interating the seeds array
 *  Returns the peer object
 */
module.exports = function (options, callback) {
    // if (!options.logger || !options.logger.error || !options.logger.info || !options.logger.warn || !options.logger.debug) {
    //     throw new Error("alogger that implements the error, info, warn and debug methods must be passed to the node");
    // }

    // var transport = options.transport;
    const seeds = options.seeds;

    //  create the node
    // var peer = new Node(options);

    const node_param = {
        identity: options.identity,
        storage: options.storage,
        contact: options.contact
    };

    const node = new kad.KademliaNode(node_param);
    node.listen(options.contact.port, options.contact.hostname, err => {
        if (err) {
            console.log('Listen error: ', err);
            return;
        }

        console.log(`Identity ${options.identity} is listening on port ${config.transport.port}`);
    });

    if (!seeds || seeds.length < 1) {
        options.logger.warn("there are no seeds defined, the node is not connected to any seeds");
        // There are no seeds, this must be the very first participant of the Streembit network
        return callback(null, node);
    }

    if (!Array.isArray(seeds)) {
        //  must be an array
        throw new Error("the seeds must be an array");
    }

    async.mapSeries(
        seeds,
        function (seed, done) {
            seed = [
                seed.identity,
                {
                    hostname: seed.host,
                    port: seed.port
                }
            ];
            var result = { seed: seed, error: null };
            try {
                node.join(seed, function (err) {
                    if (err) {
                        result.error = err;
                        return done(null, result);
                    }

                    console.info(`connected to ${node.router.size} peers`);
                    //var contact = peer._rpc._createContact(seed);
                    //peer._router.findNode(contact.nodeID, function (err) {
                        result.error = null;
                        done(null, result);
                    //});
                });
            }
            catch (e) {
                options.logger.error("node.join error: %j", e);
                result.error = e;
                done(null, result);
            }
        },
        function (err, results) {
            if (err || results.length == 0) {
                return callback("Failed to connect to any seed", node);
            }

            var seed_success_count = 0;
            results.forEach(function (item, index, array) {
                if (item.seed && !item.error) {
                    seed_success_count++;
                    options.logger.debug("seed connected: %j", item.seed);
                }
            });

            if (!seed_success_count) {
                err = "Failed to connect to any seed";
            }

            callback(err, node);
        }
    );
};
