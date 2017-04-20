/**
 * @module kad
 * @license AGPL-3.0
 * @author Gordon Hall https://github.com/bookchin
 */

'use strict';

/**
 * Returns a new {@link KademliaNode}
 * @function
 */
module.exports = function(options) {
  return new module.exports.KademliaNode(options);
};

/** {@link AbstractNode} */
module.exports.AbstractNode = require('./node-abstract');

/** {@link Bucket} */
module.exports.Bucket = require('./bucket');

/** {@link module:constants} */
module.exports.constants = require('./constants');

/** {@link ErrorRules} */
module.exports.ErrorRules = require('./rules-errors');

/** {@link KademliaNode} */
module.exports.KademliaNode = require('./node-kademlia');

/** {@link KademliaRules} */
module.exports.KademliaRules = require('./rules-kademlia');

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

/** {@link module:utils} */
module.exports.utils = require('./utils');
