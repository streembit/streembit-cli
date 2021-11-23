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
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

import { constants } from "../../libs/constants/index.js";
import { config } from "../../libs/config/index.js";
import * as peermsg from "../../libs/message/index.js";
import bs58check from "bs58check";
import createHash from "create-hash";
import secrand from "secure-random";
import { KadHandler } from "./kad.js";
import PeerClient from "./peerclient.js";

const kad = new KadHandler();

//
// Net Factory
//
class NetFactory {

    static get net() {
        return NetFactory.create_net();
    }

    static create_net() {
        var netlib; 
        switch (config.net) {
            case constants.CLIENTNET:
                var clientnet = new PeerClient();
                netlib = clientnet;
                break;
            default:
                var kadnet = new kad.KadHandler();
                netlib = kadnet;
                break;
        }
        return netlib;
    }
}

export class PeerNet {
    constructor() {
    }

    create_id() {
        return secrand.randomBuffer(8).toString("hex");
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

    send_contact_offer(crypto_key, account, user_pkhash, user_public_key, contact_public_key, contact_pkey_hash, connsymmkey, transport, address, localip, port, type, cbfunc) {
        try {
            if (!cbfunc || typeof cbfunc != "function") {
                throw new Error("send_contact_offer error: invalid callback parameter")
            }

            if (!transport ) {
                return cbfunc("send_contact_offer error: invalid transport parameter");
            }

            if (!user_pkhash || !user_public_key || !address || !type ) {
                return cbfunc("send_contact_offer error: invalid user parameters");
            }

            if (!contact_public_key  ) {
                return cbfunc("send_contact_offer error: invalid contact public key parameter");
            }

            if ( !connsymmkey) {
                return cbfunc("send_contact_offer error: invalid connsymmkey parameters");
            }

            var pkey_hexbuffer = new Buffer(contact_public_key, 'hex');
            var rmd160buffer = createHash('rmd160').update(pkey_hexbuffer).digest();
            var contact_pkhash = bs58check.encode(rmd160buffer);
            if (contact_pkey_hash != contact_pkhash) {
                return cbfunc("send_contact_offer error: contact pkeyhash mismatch");
            }

            var contact_bs58public_key = bs58check.encode(pkey_hexbuffer);            

            //  publish the public keys so this client can communicate with the devices
            //  via direct peer to peer messaging as well
            // create the WoT message 

            var keydata = user_pkhash + "/" + contact_pkhash;
            var payload = {};
            payload.type = peermsg.MSGTYPE.CAMSG;
            payload[peermsg.MSGFIELD.KEYDATA] = keydata;

            var plain = {};
            plain[peermsg.MSGFIELD.ACCOUNT] = account || "";
            plain[peermsg.MSGFIELD.PUBKEY] = user_public_key;
            plain[peermsg.MSGFIELD.PROTOCOL] = transport;
            plain[peermsg.MSGFIELD.HOST] = address;
            plain[peermsg.MSGFIELD.LOCALIP] = localip;
            plain[peermsg.MSGFIELD.PORT] = port;
            plain[peermsg.MSGFIELD.UTYPE] = type;
            plain[peermsg.MSGFIELD.SYMKEY] = connsymmkey;            

            var plaindata = JSON.stringify(plain);
            var cipher = peermsg.ecdh_encypt(crypto_key, contact_public_key, plaindata);
            payload[peermsg.MSGFIELD.CIPHER] = cipher;            

            var id = this.create_id();

            var value = peermsg.create_jwt_token(crypto_key, id, payload, null, null, user_public_key, null, contact_bs58public_key);

            var keybuffer = new Buffer(keydata);
            var key = createHash('rmd160').update(keybuffer).digest('hex');

            // put the message to the network
            NetFactory.net.put(key, value, (err) => cbfunc(err));

            //
        }
        catch (e) {
            cbfunc(e);
        }
    }
}
