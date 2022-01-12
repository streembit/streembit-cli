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

import { logger } from 'streembit-util';
import { Account } from '../../account/index.js';
import { Users } from '../../users/index.js';
import * as peermsg from '../../message/index.js';
import createHash from 'create-hash';
import bs58check from 'bs58check';

const verify_signature = (params, callback) => {

    try {
        const payload = peermsg.getpayload(params.value);
        if (!payload || !payload.data || !payload.data.type) {
            return callback("validate() error invalid payload");
        }

        let is_update_key = false;
        if (payload.data.type == peermsg.MSGTYPE.PUBPK || payload.data.type == peermsg.MSGTYPE.UPDPK || payload.data.type == peermsg.MSGTYPE.DELPK) {
            if (!payload.iss || typeof payload.iss != "string" || !payload.iss.length) {
                return callback("validate() error invalid public key payload");
            }
            is_update_key = true;
        }

        const items = payload.data[peermsg.MSGFIELD.KEYDATA].split("/");
        if (!items || items.lentgh == 1) {
            return callback("validate() invalid message key");
        }

        const checkkey = items[0];

        //  check if the bs58 key is correctly computed from the hex public key
        //  and then the JWT signature will validate the integrity of message
        let publickey;
        try {
            // payload.iss is a BS58check encoded key
            const bs58buffer = bs58check.decode(payload.iss);
            const publickey = bs58buffer.toString("hex");
            const buffer = Buffer.from(publickey, 'hex');
            const rmd160buffer = createHash('rmd160').update(buffer).digest();
            const bs58pk = bs58check.encode(rmd160buffer);
            if (checkkey != bs58pk) {
                return callback("validate() error invalid key value or public key mismatch");
            }

            if (!publickey) {
                return callback('invalid public key');
            }

            const decoded_msg = peermsg.decode(params.value, publickey);
            if (!decoded_msg) {
                return callback('VERIFYFAIL ' + checkkey);
            }
        }
        catch (err) {
            return callback("validate() error: " + err.message);
        }        

        //  passed the validation -> add to the network
        logger.debug('validation for msgtype: ' + payload.data.type + ' is OK');

        //node._log.debug('data: %j', params);
        callback(null, true);
    }
    catch (err) {
        return callback("validate() error: " + err.message);
    }

}

export const validate = (message, callback) => {
    try {
        logger.debug('validate');

        if (!message || (!message.method && !message.type && !message.action)){
            return callback(new Error('Invalid message detected at validate'));
        }

        let params;
        if (message.method) {
            if (message.method != "STORE" || !message.params || !message.params.item) {
                // only validate the STORE messages
                return callback();
            }

            params = message.params.item;
        }
        else if (message.type || message.action) {
            params = message;
        }

        if (!params.key || !params.value) {
            return callback(new Error('Invalid message detected at validate, key and value are expected'));
        }

        logger.debug('validate PUT key: ' + params.key);

        verify_signature(params, (err, isvalid) => {
            if (err) {
                return callback(new Error('Message dropped ' + ((typeof err === 'string') ? err : (err.message ? err.message : "validation failed"))));
            }
            if (!isvalid) {
                return callback(new Error('Message dropped, reason: validation failed'));
            }

            // valid message
            return callback();
        });
    }
    catch (err) {
        callback(err);
    }
}

const get_user = (pubkey) => {
    const users = new Users();
    return users.get_user_bypublickey(pubkey);
}

export const verify_wsjwt = (msg, callback) => {

    // parse the message
    const payload = peermsg.getpayload(msg);
    if (!payload || !payload.data || !payload.data.type || payload.data.type != peermsg.MSGTYPE.IOTAUTH) {
        throw new Error("authentication failed, invalid payload");
    }

    if (!payload.iss) {
        throw new Error("authentication failed, invalid iss field in the payload");
    }

    const bs58buffer = bs58check.decode(payload.iss);
    const publickey = bs58buffer.toString("hex");
    const user = get_user(publickey);
    if (!user) {
        throw new Error("authentication failed, user definition doesn't exist ");
    }

    const decoded = peermsg.decode(msg, publickey);
    if (!decoded || !decoded.data) {
        throw new Error("authentication failed, invalid encoded payload");
    }

    const cipher = decoded.data.cipher;
    if (!cipher) {
        throw new Error("authentication failed, invalid cipher in the request payload");
    }

    let plaintext = 0;
    try {
        const account = new Account();
        plaintext = peermsg.ecdh_decrypt(account.cryptokey, publickey, cipher);
        const obj = JSON.parse(plaintext);
        if (!obj) {
            throw new Error("authentication AES decryption failed");
        }
    }
    catch (err) {
        throw new Error("authentication AES decryption error " + err.message);
    }

    const token = obj.session_token;
    if (!token) {
        throw new Error("authentication failed, invalid session token");
    }

    if (user.pkhash != obj.pkhash) {
        throw new Error("authentication failed, invalid pkhash");
    }

    const devices = obj.devices;

    return { pkhash: user.pkhash, token: token, devices: devices };

}