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

Streembit team plugin for
 * @package kadence
 * @author Gordon Hall https://github.com/bookchin
-------------------------------------------------------------------------------------------------------------------------
*/


'use strict';

const SeedlistDb = require("libs/database/seedlistdb");
const constants = require('./constants');


/**
 * Keeps track of seen contacts in a sqlite database so they can be used as
 * bootstrap nodes
 */
class SeedlistPlugin {
    /**
     * @constructor
     * @param {KademliaNode} node
     */
    constructor(node) {
        this.node = node;

        this.db = new SeedlistDb();

        this.node.router.events.on('add', identity => {
            this.node.logger.debug(`updating peer profile ${identity}`);
            const { hostname, port } = this.node.router.getContactByNodeId(identity);
            this.setExternalPeerInfo(identity, hostname, port);
        });
    }

    /**
     * Returns a list of bootstrap nodes from local profiles
     * @returns {object}
     */
    async getBootstrapCandidates() {
        return await this.db.getSeeds(constants.K);
    }

    /**
     * Returns the external peer data for the given identity
     * @param {string} identity - Identity key for the peer
     * @returns {object}
     */
    async getExternalPeerInfo(identity) {
        return await this.db.getByKey(identity);
    }

    /**
     * Updates local profiles with the external peer data for the given identity
     * @param {string} identity - Identity key for the peer
     * @param {object} host - Peer's external contact host
     * @param {object} port - Peer's external contact port
     * @returns {object}
     */
    async setExternalPeerInfo(identity, host, port) {
        return await this.db.addSeed(...arguments);
    }
}

/**
 * Registers a {@link module:kadence/seedlist~SeedlistPlugin} with a
 * {@link KademliaNode}
 */
module.exports = function () {
    return function (node) {
        return new SeedlistPlugin(node);
    }
};

module.exports.SeedlistPlugin = SeedlistPlugin;
