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

const async = require('async');
const constants = require("libs/constants");
const events = require("streembit-util").events;
const kad = require('libs/kadence');

class Node {

    constructor() {
        this.node = null;
        this.logger = null;
        this.seeds = null;
        this.peercount = 0;
    }

    eventHandlers() {
        events.on(
            "kad_message",
            (message, req, res) => {
                const m_json = JSON.stringify(message);
                const buffer = Buffer.from(m_json);

                req.on('error', (err) => {
                    this.node.transport.emit('error', err)
                });

                res.on('error', (err) => {
                    this.node.transport.emit('error', err)
                });

                res.setHeader('x-kad-message-id', req.headers['x-kad-message-id']);
                res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
                res.setHeader('Access-Control-Allow-Methods', '*');
                res.setHeader('Access-Control-Allow-Headers', '*');
                res.setHeader('Access-Control-Allow-Credentials', 'true');

                this.node.transport._pending.set(req.headers['x-kad-message-id'], {
                    timestamp: Date.now(),
                    response: res
                });
                this.node.transport.push(buffer);
            }
        );
        
    }

    join(callback) {

        if (!this.seeds || this.seeds.length < 1) {
            this.logger.warn("There are no Kademlia seeds defined, the node is not connected to any seeds");
            // There are no seeds, this must be the very first participant of the Streembit network
            return callback(0);
        }

        if (!Array.isArray(this.seeds)) {
            //  must be an array
            this.logger.error("node join error: Kademlia seeds must be an array");
            return callback(0);
        }

        async.mapSeries(
            this.seeds,
            (item, cbfunc) => {
                let seed = [
                    item.id,
                    {
                        hostname: item.host,
                        port: item.port
                    }
                ];
                var result = { seed: seed, error: null };
                try {
                    this.node.join(seed, (err) => {
                        if (err) {
                            result.error = err;
                        }
                        try {
                            cbfunc(null, result);
                        }
                        catch (ferr) { }
                    });
                }
                catch (e) {                    
                    result.error = e;
                    cbfunc(null, result);
                }
            },
            (err, results) => {
                if (err) {
                    this.logger.error("node.join error: %j", err);
                    return callback(0);
                }

                if (results.length == 0) {
                    return callback(0);
                }

                var seed_success_count = 0;
                results.forEach((item, index, array) => {
                    if (item.error) {
                        this.logger.error(item.error);
                    }
                    if (item.seed && !item.error) {
                        seed_success_count++;
                        this.logger.debug("seed connected: %j", item.seed);
                    }
                });

                // do not return the error but keep trying to connect to the seeds
                callback(seed_success_count);
            }
        );
    }

    async init (options, callback) {
        if (!options.logger || !options.logger.error || !options.logger.info || !options.logger.warn || !options.logger.debug) {
            return callback("A logger that implements the error, info, warn and debug methods must be passed to the Kademlia node");
        }

        this.logger = options.logger;

        const node_param = Object.assign({}, options);
        this.node = new kad.KademliaNode(node_param);

        // enable pubsub system
        this.node.plugin(kad.quasar());

        // start the event handlers
        this.eventHandlers();

        // enable storage for seen contacts
        const seedlist = this.node.plugin(kad.seedlist());
        const peers = await seedlist.getBootstrapCandidates();

        this.seeds = [...options.seeds, ...peers.filter(p => options.seeds.every(s => p.id !== s.id))];

        this.node.listen(options.contact.port, options.contact.hostname, err => {
            if (err) {
                return callback('KAD listen error: ' + err);
            }

            this.logger.info(`Identity ${options.identity} is listening on port ${options.contact.port}`);

            // join the Kademlia network
            this.join((count) => {
                var routcount = this.node.router.size;
                this.peercount = routcount > count ? routcount : count;                
                if (this.peercount > 0) {
                    this.logger.info(`Kademlia node connected to ${this.peercount} peers`);
                }
                else {
                    if (this.seeds.length) {
                        // there is seeds exists, but failed to connect
                        this.logger.error("Failed to connect to any seed");
                    }                   
                }

                callback(null, this.node, this.peercount);
            });

            //
        });
    }
}

module.exports = Node;
