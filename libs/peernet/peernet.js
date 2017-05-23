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
Author: Tibor Zsolt Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var streembit = streembit || {};

var assert = require('assert');
var querystring = require('querystring');
var config = require('./config');
var kadlib = require('streembitlib/kadlib');
var peermsg = require('./libs/index').message;
var bs58check = require('bs58check');
var createHash = require('create-hash');

streembit.account = require("./account");

var T_MSG_EXPIRE = 259200 * 1000;  // 72 hours of message expiry
var T_ITEM_EXPIRE = 86460 * 1000; // 24 hours of item expiry


streembit.PeerNet = (function (peerobj, logger) {
    
    peerobj.node = 0;
    peerobj.db = 0;

    function validate(params, contact, callback) {

        try {
            var payload = peermsg.getpayload(params.value);
            if (!payload || !payload.data || !payload.data.type) {
                return callback("validate() error invalid payload");
            }

            var is_update_key = false;
            if (payload.data.type == peermsg.MSGTYPE.PUBPK || payload.data.type == peermsg.MSGTYPE.UPDPK || payload.data.type == peermsg.MSGTYPE.DELPK) {
                if (!payload.iss || typeof payload.iss != "string" || !payload.iss.length) {
                    return callback("validate() error invalid public key payload");
                }
                is_update_key = true;
            }

            var checkkey;
            if (is_update_key) {
                checkkey = params.key;
            }
            else {
                //  must be a forward slash separated key and the first
                //  item must be the bs58 hashed publich key
                var items = params.key.split("/");
                if (!items || items.lentgh == 1) {
                    return callback("validate() invalid message key");
                }
               
                checkkey = items[0];   
            }

            //  check if the bs58 key is correctly computed from the hex public key
            //  and then the JWT signature will validate the integrity of message
            var publickey;
            try {
                // payload.iss is a BS58check encoded key
                var bs58buffer = bs58check.decode(payload.iss);
                var publickey = bs58buffer.toString("hex");    
                var buffer = new Buffer(publickey, 'hex');
                var rmd160buffer = createHash('rmd160').update(buffer).digest();
                var bs58pk = bs58check.encode(rmd160buffer);
                if (checkkey != bs58pk) {
                    return callback("validate() error invalid key value or public key mismatch");
                }
            }
            catch (err) {
                return callback("validate() error: " + err.message);
            }

            if (!publickey) {
                return callback('invalid public key');
            }

            var decoded_msg = peermsg.decode(params.value, publickey);
            if (!decoded_msg) {
                return callback('VERIFYFAIL ' + checkkey);
            }

            //  passed the validation -> add to the network
            logger.debug('validation for msgtype: ' + payload.data.type + '  is OK');

            //node._log.debug('data: %j', params);
            callback(null, true);
        }
        catch (err) {
            return callback("validate() error: " + err.message);
        }

    }

    function validate_msg(message, contact) {
        return new Promise((resolve, reject) => {
            if (!message || !message.method || message.method != "STORE" ||
                !message.params || !message.params.item || !message.params.item.key || !message.params.item.value) {
                // only validate the STORE messages
                return resolve();
            }

            logger.debug('validate STORE key: ' + message.params.item.key);

            validate(message.params.item, contact, function (err, isvalid) {
                if (err) {
                    return reject(new Error('Message dropped ' + ((typeof err === 'string') ? err : (err.message ? err.message : "validation failed"))));
                }
                if (!isvalid) {
                    return reject(new Error('Message dropped, reason: validation failed'));
                }

                // valid message
                return resolve();
            });

        });
    }

    // TODO validate contacts mforfor private network/blockchain and blacklisted contacts
    function validate_contact() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
   
    function onKadMessage(message, contact, next) {
        try {
            validate_contact().then(
                function () {
                    // contact is allowed, validate the message
                    return validate_msg(message, contact);
                }
            ).then(
                function () {
                    // the message is valid             
                    next();
                }
            ).catch(function (err) {
                // failed
                next(err);
            });                   

        }
        catch (err) {
            logger.error("onKadMessage error: " + err.message);
            next("onKadMessage error: " + err.message);
        }
    }
    

    function onPeerMessage(message, info) {        
    }

    function onTransportError(err) {
        logger.error('RPC error: %j', err);
    }
    
    peerobj.get_buckets = function (streembitdb, callback) {
        if (peerobj.node) {
            var buckets = peerobj.node._router._buckets;
            return buckets;
        }
    },
    
    peerobj.start = function (streembitdb, seeds, callback) {
        try {
            
            logger.info('Bootstrap P2P network');
            
            assert(config.node.address, "config node address must be initialized");
            assert(config.node.port, "config node port must be initialized");

            if (config.private_network) {
                assert(streembit.account.crypto_key, "account must be initialized for private network");
                logger.debug("private network = true");
                logger.debug("account name: %s", streembit.account.name);
                logger.debug("bs58 publick key: %s", streembit.account.publicKeyBs58);
            }
            
            var param = {
                address: config.node.address,
                port: config.node.port
            };

            if (config.private_network) {
                param.publickey = streembit.account.publicKeyBs58;
            }
            
            var contact = kadlib.contacts.StreembitContact(param);
            logger.info('this contact object: ' + contact.toString());
            
            var transport_options = {
                logger: logger
            };
            var transport = kadlib.transports.TCP(contact, transport_options);
            
            transport.after('open', function (next) {
                // exit middleware stack if contact is blacklisted
                logger.info('TCP peer connection is opened');
                
                // otherwise pass on
                next();
            });
            
            // message validator
            transport.before('receive', onKadMessage);

            // handle errors from RPC
            transport.on('error', onTransportError);
            
            var options = {
                transport: transport,
                logger: logger,
                storage: streembitdb,
                seeds: seeds,
                onPeerMessage: onPeerMessage
            };
            
            kadlib.create(options, function (err, peer) {
                if (err) {
                    logger.error("peernet start error: %j", err);
                }
                
                // still set the objects so the very first node on the network is still operational
                peerobj.db = streembitdb;
                peerobj.node = peer;
                callback();
            });

            //
            //
        }
        catch (err) {
            callback("P2P handler start error " + err.message);
        }
    }
    
    return peerobj;
    
}(streembit.PeerNet || {}, global.applogger));


module.exports = streembit.PeerNet;