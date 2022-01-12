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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

import { JWT } from './jwt.js';
import { jwe } from './jwe.js';

const jwt = new JWT();

const MSGTYPE = {
    PUBPK: 0x01,    //  Add public key to the network. Must perform this when the node joins first time to the P2P network    
    DELPK: 0x02,    //  Remove the existing public key from the network
    DATA: 0x03,     //  Publish data to the network
    OMSG: 0x04,     //  Off-line message
    UPDPK: 0x05,    //  Update public key
    DELMSG: 0x06,   //  Delete message
    CAMSG: 0x07,    //  Contact accept message
    IOTAUTH: 0x08,  //  IoT authentication request
};

const MSGFIELD = {
    NODEID: "node_id",
    PUBKEY: "public_key",
    LASTPKEY: "last_pkey",
    CURRPK: "curr_pkey",
    CURRSIG: "curr_pkey_sig",
    ECDHPK: "ecdh_public",
    PROTOCOL: "protocol",
    HOST: "address",
    LOCALIP: "localip",
    PORT: "port",
    DATA: "data",
    CIPHER: "cipher",
    ACCOUNT: "account",
    REQJTI: "request_jti",
    UTYPE: "user_type",
    TIMES: "timestamp",
    CALLT: "call_type",
    RESULT: "result",
    SEKEY: "send_ecdh_public",
    REKEY: "rcpt_ecdh_public",
    MSGID: "msgid",
    MSGTYPE: "message_type",
    TASKID: "taskid",
    SYMKEY: "symkey",
    KEYDATA: "keydata"
};

const PEERMSG = {
    DHOP: 0xDAD,    //  DHOP = Diffie Hellman Operation, DH encrypted message. Use it only for encrypting the session symmetric key
    EXCH: 0xDAE,    //  Key exchange operation, the peer sends its DH public key part to the other peer
    SYMD: 0xDAF,    //  Data encrypted with the exchanged symmetric key
    PING: 0xDB0,    //  Ping request
    PREP: 0xDB1,    //  Ping reply
    ACCK: 0xDB2,    //  Accept session symmetric key
    CALL: 0xDB3,    //  Video call
    CREP: 0xDB4,    //  Reply to video call
    MDEL: 0xDB5,    //  Delete message
    FILE: 0xDB6,    //  File transfer init
    FREP: 0xDB7,    //  Reply file transfer init
    HCAL: 0xDB8,    //  Close call
    ACRQ: 0xDB9,    //  Add contact request
    AACR: 0xDBA,    //  Accept add contact request
    DACR: 0xDBB,    //  Deny add contact request
    SSCA: 0xDBC,    //  Screen share call
    RSSC: 0xDBD,    //  Reply screen share call
    RESF: 0xDBE,    //  Resume send file 
    ARES: 0xDBF,    //  Accept resume send file 
    FSTA: 0xDC0,    //  File receive status
    DATA: 0xDC1,    //  Send custom data message
    UTI1: 0xDC2,    //  Utility call 1 (Reserved for some currently uknown device or UI handling)
    UTI2: 0xDC3,    //  Utility call 2 (Reserved for some currently uknown device or UI handling)
    UTI3: 0xDC4,    //  Utility call 3 (Reserved for some currently uknown device or UI handling)
    UTI4: 0xDC5,    //  Utility call 4 (Reserved for some currently uknown device or UI handling)
    UTI5: 0xDC6     //  Utility call 5 (Reserved for some currently uknown device or UI handling)
};


const serialize = (input) => {
    let text = null;
    try {
        if (typeof input != 'string') {
            if (typeof input == 'object') {
                try {
                    text = JSON.stringify(input);
                }
                catch (e) {
                    text = input.toString();
                }
            }
            else {
                text = input.toString();
            }
        }
        else {
            text = input;
        }
    }
    catch (err) {
        throw new Error("Error in serializing payload, error: %j", err, {});
    }

    if (!text)
        throw new Error("Error in serializing payload");

    return text;
}


const decode = (payload, public_key) => {
    if (!public_key) {
        throw new Error("WoTMessage decode error: public_key parameter is missing");
    }

    if (!payload) {
        throw new Error("WoTMessage decode error: payload parameter is missing");
    }

    const message = jwt.decode(payload, public_key);

    return message;
}

const create_jwt_token = (private_key, jti, payload, algorithm, expires, issuer, subject, audience) => {
    if (!private_key) {
        throw new Error("WoTMessage private_key parameter is missing");
    }

    if (!payload) {
        throw new Error("WoTMessage payload parameter is missing");
    }

    if (!jti) {
        throw new Error("WoTMessage jti parameter is missing");
    }

    let input = {};

    // create a data field for the actual data if not exists
    if (payload.hasOwnProperty('data') == false) {
        input.data = payload;
    }
    else {
        input = payload;
    }

    let options = {};

    options.jti = jti;

    if (expires) {
        options.expires = expires;
    }

    if (issuer) {
        options.issuer = issuer;
    }

    if (subject) {
        options.subject = subject;
    }

    if (audience) {
        options.audience = audience;
    }

    // create a json web token
    const token = jwt.encode(input, private_key, options);

    return token;
}


const get_msg_array = (buffer) => {
    if (!buffer || typeof buffer != "string") {
        throw new Error("get_msg_array error: invalid buffer");
    }

    const elements = jwt.parse(buffer);
    return elements;
}

const get_message_payload = (msg) => {
    const payload = jwt.get_message_payload(msg);
    return payload;
}


const base64decode = (data) => {
    return jwt.base64decode(data);
}

const ecdh_encypt = (ECDH_key, ECDH_public, data) => {
    if (!ECDH_key) {
        throw new Error("WoTMessage ecdh_encypt ECDH key parameter is missing");
    }
    if (!ECDH_public) {
        throw new Error("WoTMessage ecdh_encypt ECDH public key parameter is missing");
    }
    if (!data) {
        throw new Error("WoTMessage ecdh_encypt payload parameter is missing");
    }

    const datastr = serialize(data);
    const cipher_text = jwe.encrypt(ECDH_key, ECDH_public, datastr);

    return cipher_text;
}

const ecdh_decrypt = (ECDH_key, ECDH_public, data) => {
    if (!ECDH_key) {
        throw new Error("WoTMessage ecdh_decrypt ECDH key parameter is missing");
    }
    if (!ECDH_public) {
        throw new Error("WoTMessage ecdh_decrypt ECDH public key parameter is missing");
    }
    if (!data) {
        throw new Error("WoTMessage ecdh_decrypt payload parameter is missing");
    }

    const plain_text = jwe.decrypt(ECDH_key, ECDH_public, data);
    return plain_text;
}

const create_typedmsg = (msgtype, jti, ECC_private_key, payload, issuer, audience, expires, algorithm) => {
    if (!msgtype) {
        throw new Error("WoTMessage create_msg error: msgtype parameter is missing");
    }
    if (!ECC_private_key) {
        throw new Error("WoTMessage create_msg error: private_key parameter is missing");
    }
    if (!payload) {
        throw new Error("WoTMessage create_msg error: payload parameter is missing");
    }

    const datastr = serialize(payload);
    const data = { data: datastr }

    // create a JSON Web Token (JWT)
    const token = create(ECC_private_key, jti, data, algorithm, expires, issuer, msgtype, audience);
    if (!token || (typeof token != 'string')) {
        throw new Error("Invalid JWT token, token must be string");
    }

    return token;
}

const create_symm_msg = (msgtype, jti, ECC_private_key, session_symmetric_key, payload, issuer, audience, expires, algorithm) => {
    if (!ECC_private_key) {
        throw new Error("WoTMessage create_symm_peermsg private_key parameter is missing");
    }
    if (!session_symmetric_key) {
        throw new Error("WoTMessage create_symm_peermsg symmetric key parameter is missing");
    }
    if (!payload) {
        throw new Error("WoTMessage create_symm_peermsg payload parameter is missing");
    }

    const datastr = serialize(payload);

    // get JSON Web Encryption (JWE) encrypted structure
    const cipher_text = jwe.symm_encrypt(session_symmetric_key, datastr);
    const data = { data: cipher_text }

    // create a JSON Web Token (JWT)
    const token = create(ECC_private_key, jti, data, algorithm, expires, issuer, msgtype, audience);
    assert(token && (typeof token == 'string'), "Invalid JWT token, token must be string");

    return token;
}

const decrypt = (symmetric_key, payload) => {
    if (!symmetric_key) {
        throw new Error("WoTMessage decrypt symmetric_key parameter is missing");
    }
    if (!payload) {
        throw new Error("WoTMessage create_symm_peermsg payload parameter is missing");
    }

    const plain_text = jwe.symm_decrypt(symmetric_key, payload);
    return plain_text;
}


const aes256decrypt = (symmetric_key, cipher_text) => {
    return jwe.aes256decrypt(symmetric_key, cipher_text);
}

const aes256encrypt = (symmetric_key, data) => {
    return jwe.aes256encrypt(symmetric_key, data);
}

export {
    get_message_payload as getpayload,
    decode,
    base64decode,
    create_jwt_token,
    create_typedmsg,
    create_symm_msg,
    get_msg_array,
    ecdh_encypt,
    ecdh_decrypt,
    decrypt,
    MSGTYPE,
    MSGFIELD,
    PEERMSG,
    aes256encrypt,
    aes256decrypt
}
