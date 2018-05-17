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

Based on kadence library https://github.com/kadence author Gordon Hall https://github.com/bookchin
-------------------------------------------------------------------------------------------------------------------------
*/


/**
 * @module kadence
 * @license AGPL-3.0
 * @author Gordon Hall https://github.com/bookchin
 */

'use strict';

/**
 * Returns a new {@link KademliaNode}
 */
module.exports = function(options) {
    return new module.exports.KademliaNode(options);
};

/** {@link KademliaNode} */
module.exports.KademliaNode = require('./node-kademlia');

/** {@link KademliaRules} */
module.exports.KademliaRules = require('./rules-kademlia');

/** {@link AbstractNode} */
module.exports.AbstractNode = require('./node-abstract');

/** {@link ErrorRules} */
module.exports.ErrorRules = require('./rules-errors');

/** {@link Bucket} */
module.exports.Bucket = require('./bucket');

/** {@link Messenger} */
module.exports.Messenger = require('./messenger');

/** {@link RoutingTable} */
module.exports.RoutingTable = require('./routing-table');

/** {@link UDPTransport} */
module.exports.UDPTransport = require('./transport-udp');

/** {@link HTTPTransport} */
module.exports.HTTPTransport = require('./transport-http');

/** {@link HTTPSTransport} */
module.exports.HTTPSTransport = require('./transport-https');

/** {@link module:kadence/hibernate} */
module.exports.hibernate = require('./plugin-hibernate');

/** {@link module:kadence/quasar} */
module.exports.quasar = require('./plugin-quasar');

/** {@link module:kadence/rolodex} */
module.exports.rolodex = require('./plugin-rolodex');

/** {@link module:kadence/contentaddress} */
module.exports.contentaddress = require('./plugin-contentaddress');

/** {@link module:kadence/trust} */
module.exports.trust = require('./plugin-trust');

/** {@link module:kadence/constants} */
module.exports.constants = require('./constants');

/** {@link module:kadence/utils} */
module.exports.utils = require('./utils');

/** {@link module:kadence/logger} */
module.exports.logger = require('./logger');

module.exports.create = require('./addons/create');
