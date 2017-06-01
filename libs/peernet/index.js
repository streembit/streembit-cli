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

const constants = require("libs/constants");
const peermsg = require("libs/message");

class PeerNet {
    constructor() {
    }

    publish_account(symcryptkey, key, public_key, transport, address, port, type, account_name, callback) {
        try {
            if (!callback || typeof callback != "function") {
                throw new Error("publish_account error: invalid callback parameter")
            }

            //  publishing user data
            if (!public_key || !address || (transport == "tcp" && !port)) {
                return callback("invalid parameters at publish_account");
            }

            if (!symcryptkey) {
                return callback("invalid symmetric key at publish_account");
            }

            //  publish the public keys so this client can communicate with the devices
            //  via direct peer to peer messaging as well
            // create the WoT message 
            var ctype = type || constants.USERTYPE_HUMAN;

            var payload = {};
            payload.type = peermsg.MSGTYPE.PUBPK;

            var plain = {};
            plain[peermsg.MSGFIELD.ACCOUNT] = account_name;
            plain[peermsg.MSGFIELD.PUBKEY] = public_key;
            plain[peermsg.MSGFIELD.PROTOCOL] = transport;
            plain[peermsg.MSGFIELD.HOST] = address;
            plain[peermsg.MSGFIELD.PORT] = port;
            plain[peermsg.MSGFIELD.UTYPE] = ctype;

            var cipher = peermsg.aes256encrypt(symcryptkey, JSON.stringify(plain));
            payload[peermsg.MSGFIELD.CIPHER] = cipher;

            logger.debug("publish_user with key: %s", key);

            var value = peermsg.create_jwt_token(appsrvc.cryptokey, create_id(), payload, null, null, public_key, null, null);

            //  For this public key upload message the key is the device name
            net.put(key, value, function (err) {
                if (err) {
                    return callback(err.message ? err.message : err);
                }

                logger.debug("peer key " + key + " published");
                callback();
            });
        }
        catch (e) {
            callback("Publish peer user error: " + e.message);
        }
    }
}


module.exports = PeerNet;