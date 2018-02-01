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

const config = require("libs/config");
const logger = require("streembit-util").logger;
const db = require("streembit-db").instance;
const kad = require('libs/kad');
const Account = require("libs/account");
const utils = require("libs/utils");
const async = require("async");
const constants = require("libs/constants");

let instance = null;

class KadHandler {
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
                throw new Error("the KAD node is not initialized")
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
                throw new Error("the KAD node is not initialized")
            }

            this.node.put(key, value, callback);
        }
        catch (err) {
            //logger.error("put error: %s", err.message)
            callback(err.message || err);
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

        var account = new Account();
        var bs58pk = account.bs58pk;

        var contact_param = {
            host: config.transport.host,
            port: config.transport.port,
            publickey: bs58pk
        };       

        var contact = kad.contacts.StreembitContact(contact_param);
        logger.info('this contact object: ' + contact.toString());

        var httpopts = {
            logger: logger,
            peermsgrcv: options.peermsgrcv
        };
        if (config.transport.ssl) {
            httpopts.ssl = true;
        }
        var transport = kad.transports.HTTP(contact, httpopts);
        transport.after('open', function (next) {
            // exit middleware stack if contact is blacklisted
            logger.info('TCP peer connection is opened');

            // otherwise pass on
            next();
        });
       
        // message validator
        transport.before('receive', options.onKadMessage);

        // handle errors from RPC
        transport.on('error', options.onTransportError);

        var seeds = utils.ensure_seeds(options.seeds);

        var options = {
            transport: transport,
            logger: logger,
            storage: db.getdb("streembitkv"), // streembit key-value database (leveldb)
            seeds: seeds,
            isseed: options.isseed,
            config: config
        };

        kad.create(options, (err, peer) => {
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

module.exports.KadHandler = KadHandler;


