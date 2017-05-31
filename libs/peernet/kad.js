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
Author: Tibor Zsolt Pardi
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const config = require("libs/config");
const logger = require("libs/logger");
const db = require("libs/database");
const kad = require('libs/kad');
const Account = require("libs/account");
const utils = require("libs/utils");
const async = require("async");

class KadHandler {
    constructor() {
        this.m_node = 0;
    }

    get node(){
        return this.m_node;
    }

    set node(n) {
        this.m_node = n;
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
                    node.connect(seed, function (err) {
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
        var transport = new kad.HTTPTransport();
        var account = new Account();
        var bs58pk = account.bs58pk;
        var contact = { hostname: config.ipaddress, port: config.port, pubkey: bs58pk};
        var storage = db.streembitdb;

        var seeds = utils.ensure_seeds(options.seeds);

        this.node = kad({ transport: transport, storage: storage, logger: logger, contact: contact });

        if (options.onNodeMessage && (typeof options.onNodeMessage === "function")) {
            this.node.use(options.onNodeMessage);
        }

        var host = utils.is_ipaddress(config.ipaddress) ? config.ipaddress : null;
        this.node.listen(config.port, host, () => {
            logger.debug("node listen complete")
            this.join(seeds, callback);
        });        
    }

}

module.exports.KadHandler = KadHandler;


