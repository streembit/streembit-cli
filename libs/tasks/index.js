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

const logger = require("libs/logger");
const events = require("libs/events");
const constants = require("libs/constants");
const PeerNet = require("libs/peernet");
const Contacts = require("libs/contacts");
const async = require("async");
const Account = require("libs/account");
const config = require("libs/config");
const IoTHandler = require('libs/iot');
const BlockchainHandler = require('libs/blockchain');

class TaskManager {

    constructor() {
    }

    inform_contacts(payload) {
        try {
            logger.debug("start inform_contacts");

            var account = new Account();
            var pubkey_hash = account.public_key_hash;
            var public_key = account.bs58pk;
            var address = config.host;
            var port = config.port;
            var transport = constants.DEFAULT_TRANSPORT;
            var type = config.usertype;
            var pubkeyhash = account.public_key_hash;
            var symcryptkey = account.connsymmkey;
            var account_name = config.account;
            var crypto_key = account.cryptokey;

            var error_count = 0;

            var peernet = new PeerNet();

            function send_to_contact(contact, next) {
                try {
                    peernet.inform_contact(crypto_key, account_name, pubkey_hash, public_key, contact.public_key, symcryptkey, transport, address, port, type, function (err) {
                        if (err) {
                            var msg = "send_to_contact error, contact: " + contact.public_key + " error: " + (err.message || err);
                            logger.error(msg);                            
                            error_count++;
                        }    
                        next();
                    }); 
                }
                catch (err) {
                    logger.error("send_to_contact error, contact: " + contact.public_key + " error: " + err.message);
                    next();
                }
            }

            var contacts = new Contacts();
            var list = contacts.list();

            async.eachSeries(list, send_to_contact, function () {
                logger.debug("inform_contacts ended. error count: " + error_count );
            });
        }
        catch (err) {
            logger.error("inform_contacts error: " + err.message);
        }
    }

    publish_account() {
        logger.debug("start publish account");

        var account = new Account();
        var public_key = account.bs58pk;
        var address = config.host;
        var port = config.port;
        var transport = constants.DEFAULT_TRANSPORT;
        var type = config.usertype;
        var pubkeyhash = account.public_key_hash;
        var symcryptkey = account.connsymmkey;
        var account_name = config.account;

        var peernet = new PeerNet();
        peernet.publish_account(symcryptkey, pubkeyhash, public_key, transport, address, port, type, account_name, callback);
    }

    on_application_init() {
        logger.debug("on_application_init");
        
        var blockchain = new BlockchainHandler();
        blockchain.init();
    }

    run(callback) {
        try {

            // initialize the task event handler
            events.on(events.TASK_INIT, (task, payload) => {
                switch (task) {
                    case constants.TASK_PUBLISHACCOUNT:
                        this.publish_account();
                        break;
                    case constants.TASK_INFORM_CONTACTS:
                        this.inform_contacts(payload);
                        break;
                    default:
                        break;
                }
            });

            events.on(events.APP_INIT, () => {
                this.on_application_init();
            });

            callback();
        }
        catch (err) {
            logger.error("task manager error: " + err.message);
        }
    }
}

module.exports = TaskManager;




