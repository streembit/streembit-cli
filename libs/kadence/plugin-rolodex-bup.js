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

const utils = require('./utils');
const tiny = require('tiny');
const fs = require('fs');
const { EventEmitter } = require('events');


/**
 * Keeps track of seen contacts in a compact file so they can be used as
 * bootstrap nodes
 */
class RolodexPlugin extends EventEmitter {

    static get EXTERNAL_PREFIX() {
        return 'external';
    }

    static get INTERNAL_PREFIX() {
        return 'internal';
    }

    /**
     * @constructor
     * @param {KademliaNode} node
     * @param {string} peerCacheFilePath - Path to file to use for storing peers
     */
    constructor(node, peerCacheFilePath) {
        super();

        this.storagePath(peerCacheFilePath);

        this._db = null;

        this.node = node;
        this.db = new Proxy({}, {
            get: (obj, prop) => {
                const self = this;

                if (this._db) {
                    return this._db[prop];
                }

                return function() {
                    self.once('ready', () => {
                        self._db[prop](...arguments);
                    });
                };
            }
        });

        tiny(peerCacheFilePath, (err, _db) => {
            if (err) {
                this.emit('error', err);
            } else {
                this._db = _db;
                this.emit('ready');
            }
        });

        this.node.router.events.on('add', identity => {
            this.node.logger.debug(`updating peer profile ${identity}`);
            const contact = this.node.router.getContactByNodeId(identity);
            contact.timestamp = Date.now();
            this.setExternalPeerInfo(identity, contact);
        });
    }

    /**
     * Makes a path to tiny storage directory if such directory does not exist
     * @returns boolean
     */
    storagePath(path) {
        if (!fs.existsSync(path)) {
            try {
                const path_r = path.split('/');
                let path_to = [];
                path_r.slice(0, -1).forEach((dir, idx) => {
                    path_to.push(dir);
                    if (!fs.existsSync(path_to.join('/'))) {
                        fs.mkdirSync(path_to.join('/'));
                    }
                })
            } catch (err) {
                throw new Error(err.message);
            }
        }

        return true;
    }

    /**
     * Returns a list of bootstrap nodes from local profiles
     * @returns {string[]} urls
     */
    getBootstrapCandidates() {
        const candidates = [];
        return new Promise(resolve => {
            this.db.each((contact, key) => {
                const [prefix, identity] = key.split(':');

                /* istanbul ignore else */
                if (prefix === RolodexPlugin.EXTERNAL_PREFIX) {
                    candidates.push({
                        id: identity,
                        timestamp: contact.timestamp,
                        host: contact.hostname,
                        port: contact.port
                    });
                }
            }, () => {
                resolve(candidates.sort((a, b) => b.timestamp - a.timestamp));
            });
        });
    }

    /**
     * Returns the external peer data for the given identity
     * @param {string} identity - Identity key for the peer
     * @returns {object}
     */
    getExternalPeerInfo(identity) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `${RolodexPlugin.EXTERNAL_PREFIX}:${identity}`,
                (err, data) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }
            );
        });
    }

    /**
     * Returns the internal peer data for the given identity
     * @param {string} identity - Identity key for the peer
     * @returns {object}
     */
    getInternalPeerInfo(identity) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `${RolodexPlugin.INTERNAL_PREFIX}:${identity}`,
                (err, data) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }
            );
        });
    }

    /**
     * Returns the external peer data for the given identity
     * @param {string} identity - Identity key for the peer
     * @param {object} data - Peer's external contact information
     * @returns {object}
     */
    setExternalPeerInfo(identity, data) {
        return new Promise((resolve, reject) => {
            this.db.set(
                `${RolodexPlugin.EXTERNAL_PREFIX}:${identity}`,
                data,
                (err, data) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }
            );
        });
    }

    /**
     * Returns the internal peer data for the given identity
     * @param {string} identity - Identity key for the peer
     * @param {object} data - Our own internal peer information
     * @returns {object}
     */
    setInternalPeerInfo(identity, data) {
        return new Promise((resolve, reject) => {
            this.db.set(
                `${RolodexPlugin.INTERNAL_PREFIX}:${identity}`,
                data,
                (err, data) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }
            );
        });
    }

}

/**
 * Registers a {@link module:kadence/rolodex~RolodexPlugin} with a
 * {@link KademliaNode}
 * @param {string} peerCacheFilePath - Path to file to use for storing peers
 */
module.exports = function(peerCacheFilePath) {
    return function(node) {
        return new RolodexPlugin(node, peerCacheFilePath);
    }
};

module.exports.RolodexPlugin = RolodexPlugin;