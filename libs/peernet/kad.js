/*

This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines.

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Z Pardi
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

import fs from "fs";
import async from "async";
import assert from 'assert';
import { config } from '../../libs/config/index.js';
import { logger } from "streembit-util";
import Database from "streembit-db";
import * as kad from '../../libs/kadence/index.js'

const db = Database.instance;

let instance = null;

export class KadHandler {
    constructor() {
        if (!instance) {
            instance = this;
            this.m_node = 0;
        }

        return instance;
    }

    get node(){
        return this.m_node;
    }

    set node(n) {
        this.m_node = n;
    }

    get(key, callback) {
        try {
            if (!this.node) {
                throw new Error("the KAD node is not initialized");
            }

            this.node.get(key, callback);
        }
        catch (err) {
            //logger.error("put error: %s", err.message)
            callback(err.message || err);
        }
    }

    put(key, value, callback) {
        try {
            if (!this.node) {
                throw new Error("the KAD node is not initialized");
            }

            logger.info("RMTP put to node");
            this.node.put(key, value, callback);
        }
        catch (err) {
            //logger.error("put error: %s", err.message)
            callback(err.message || err);
        }
    }

    publish(msgtype, data) {
        try {
            this.node.quasarPublish(msgtype, data);
        }
        catch (err) {
            logger.error("Node publish() error %j", err)
        }
    }

    subscribe(msgtype, callback) {
        try {
            this.node.quasarSubscribe(msgtype, payload => {
                callback(payload);
            })
        } catch (err) {
            logger.error("Node subscribe() error %j", err)
        }
    }

    join(seeds, callback) {
        if (!seeds || !Array.isArray(seeds) || seeds.length == 0) {
            logger.debug("NO seeds, no join.")
            return callback();
        }

        let node = this.node;

        async.mapSeries(
            seeds,
            function (seed, done) {
                var result = { seed: seed[1], error: null };
                try {
                    logger.debug("connecting to seed " + seed[1].hostname + " port: " + seed[1].port);
                    node.join(seed, function (err) {
                        if (err) {
                            result.error = err;
                        }
                        done(null, result);
                    });
                }
                catch (e) {
                    options.logger.error("peer join error: %j", e);
                    result.error = e;
                    done(null, result);
                }
            },
            function (err, results) {
                if (err || results.length == 0 || !node.router.size) {
                    return callback("Failed to connect to any seed");
                }

                var seed_success_count = 0;
                results.forEach(function (item, index, array) {
                    if (item.seed && !item.error) {
                        seed_success_count++;
                        logger.debug("seed connected: %s:%d", item.seed.hostname, item.seed.port );
                        if (seed_success_count == 1) {
                            callback();
                        }
                    }
                });

                if (!seed_success_count) {
                    callback("Failed to connect to any seed");
                }


            }
        );
    }

    init(options, callback) {

        assert.ok(config.transport.kad.host && typeof config.transport.kad.host === "string" && config.transport.kad.host.length > 0, 'Invalid Kademlia host');
        assert.ok(config.transport.kad.port && typeof config.transport.kad.port === "number" && config.transport.kad.port > 0, 'Invalid Kademlia port');

        const init_options = {
            logger: logger,
            storage: db.getdb("streembitkv"),
            contact: {
                hostname: config.transport.kad.host,
                port: config.transport.kad.port,
            },
            seeds: options.seeds
        };

        if (config.transport.ssl) {
            init_options.contact.cert = fs.readFileSync(config.transport.cert);
            init_options.contact.key = fs.readFileSync(config.transport.key);
            if (init_options.contact.ca) {
                init_options.contact.ca = fs.readFileSync(config.transport.ca);
            }
        }

        var node = new kad.Node();
        node.init(init_options, (err, peer, peercount) => {
            if (err) {
                //  since the seed is the main module and it failed, the whole intialization failed so return the error
                //  and the async waterflow will be terminated
                return callback("KAD error " + (err.message || err));
            }

            // still set the objects so the very first node on the network is still operational
            this.node = peer;
            callback();
        });
    }
}
