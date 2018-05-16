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

/** {@link Control} */
module.exports.Control = require('./control');

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

/** {@link module:kadence/hashcash} */
module.exports.hashcash = require('./plugin-hashcash');

/** {@link module:kadence/hibernate} */
module.exports.hibernate = require('./plugin-hibernate');

/** {@link module:kadence/onion} */
module.exports.onion = require('./plugin-onion');

/** {@link module:kadence/quasar} */
module.exports.quasar = require('./plugin-quasar');

/** {@link module:kadence/spartacus} */
module.exports.spartacus = require('./plugin-spartacus');

/** {@link module:kadence/traverse} */
module.exports.traverse = require('./plugin-traverse');

/** {@link module:kadence/eclipse} */
module.exports.eclipse = require('./plugin-eclipse');

/** {@link module:kadence/permission} */
module.exports.permission = require('./plugin-permission');

/** {@link module:kadence/rolodex} */
module.exports.rolodex = require('./plugin-rolodex');

/** {@link module:kadence/contentaddress} */
module.exports.contentaddress = require('./plugin-contentaddress');

/** {@link module:kadence/trust} */
module.exports.trust = require('./plugin-trust');

/** {@link module:kadence/constants} */
module.exports.constants = require('./constants');

/** {@link module:kadence/version} */
module.exports.version = require('./version');

/** {@link module:kadence/utils} */
module.exports.utils = require('./utils');

/** {@link module:kadence/logger} */
module.exports.logger = require('./logger');

/** {@link module:kadence/contact-list} */
module.exports.contacts = require('./contacts');
