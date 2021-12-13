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

import elliptic from "elliptic";
import { Buffer } from "buffer";

const EC = elliptic.ec;
const DEFAULT_CURVE = 'secp256k1';

export class JWT {
    constructor() {
    }

    decode(token, key) {
        // check token
        if (!token) {
            throw new Error('JWT decode error: no token supplied');
        }
        // check segments
        const segments = token.split('.');
        if (segments.length !== 3) {
            throw new Error('JWT decode error: invalid segment count');
        }

        // All segment should be base64
        const headerSeg = segments[0];
        const payloadSeg = segments[1];
        const signatureSeg = segments[2];

        // base64 decode and parse JSON
        const header = JSON.parse(this.base64urlDecode(headerSeg));
        const payload = JSON.parse(this.base64urlDecode(payloadSeg));

        if (!header.alg) {
            throw new Error('Invalid JWT header alg parameter');
        }

        if (header.alg != DEFAULT_CURVE) {
            throw new Error('JWT algorithm ' + header.alg + ' is not supported');
        }

        // verify signature.
        const signbase64 = this.base64urlUnescape(signatureSeg);
        const signingInput = [headerSeg, payloadSeg].join('.');
        if (!this.verify(signingInput, key, signbase64)) {
            throw new Error('JWT signature verification failed');
        }

        return payload;
    }

    parse(token) {
        // check token
        if (!token) {
            throw new Error('JWT parse error: no token supplied');
        }
        // check segments
        const segments = token.split('.');
        if (segments.length !== 3) {
            throw new Error('JWT parse error: invalid segment count');
        }

        // All segment should be base64
        const headerSeg = segments[0];
        const payloadSeg = segments[1];
        const signatureSeg = segments[2];

        // base64 decode and parse JSON
        const header = JSON.parse(this.base64urlDecode(headerSeg));
        const payload = JSON.parse(this.base64urlDecode(payloadSeg));
        const signbase64 = this.base64urlUnescape(signatureSeg);

        return [header, payload, signbase64];
    }

    encode(payload, key, options) {
        // Check key
        if (!key) {
            throw new Error('JWT encode error: key parameter is missing');
        }

        const algorithm = DEFAULT_CURVE;

        // header, typ is fixed value.
        const header = { typ: 'JWT', alg: algorithm };

        if (options.jti) {
            payload.jti = options.jti;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        if (!options.noTimestamp) {
            payload.iat = payload.iat || timestamp;
        }

        if (options.expires) {
            if (typeof options.expires === 'number') { // must be in seconds
                payload.exp = timestamp + options.expires;
            }
            else {
                throw new Error('JWT encode error: expires must be a number of seconds');
            }
        }

        if (options.audience) {
            payload.aud = options.audience;
        }

        if (options.issuer) {
            payload.iss = options.issuer;
        }

        if (options.subject) {
            payload.sub = options.subject;
        }

        // create segments, all segments should be base64 string
        let segments = [];
        segments.push(this.base64urlEncode(JSON.stringify(header)));
        segments.push(this.base64urlEncode(JSON.stringify(payload)));

        const input = segments.join('.');
        const signature = this.sign(input, key);
        segments.push(signature);

        return segments.join('.');
    }

    get_message_payload(msg) {
        const segments = msg.split('.');
        if (segments.length !== 3) {
            throw new Error('JWT decode error: invalid segment count');
        }

        // All segment should be base64
        const payloadSeg = segments[1];
        const payload = JSON.parse(this.base64urlDecode(payloadSeg));

        return payload;
    }

    base64decode(data) {
        if (!data || typeof data != "string")
            throw new Error("base64decode invalid parameter");

        const payload = JSON.parse(this.base64urlDecode(data));
        return payload;
    }

    str2array(str) {
        const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        const bufView = new Uint16Array(buf);
        for (let i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return Array.prototype.slice.call(bufView);
    }

    verify(input, public_key, signature) {
        let valid = false;
        try {
            let msg = null;
            // input must be an array
            if (typeof input == 'string') {
                msg = this.str2array(input);
            } else if (Array.isArray(input)) {
                msg = input;
            } else {
                throw new Error("Invalid sign input. Input must be array or string");
            }

            const sigbuffer = Buffer.from(signature, 'base64');

            const ec = new EC(DEFAULT_CURVE);
            // Import public key
            const key = ec.keyFromPublic(public_key, 'hex');
            // Verify signature
            valid = key.verify(msg, sigbuffer);
        } catch (err) {
            throw new Error("JWT verify error: " + err.message)
        }

        return valid;
    }

    sign(input, key) {
        let base64str;
        try {
            let msg = null;
            // input must be an array
            if (typeof input == 'string') {
                msg = this.str2array(input);
            } else if (Array.isArray(input)) {
                msg = input;
            } else {
                throw new Error("Invalid sign input. Input must be array or string");
            }

            const ec = new EC(DEFAULT_CURVE);
            const signature = key.sign(msg);
            const sigarr = signature.toDER();
            //console.log(sigarr);
            const b64 = Buffer.from(sigarr).toString('base64');
            //console.log(b64);
            base64str = this.base64urlEscape(b64);
            //console.log(base64str);
        } catch (err) {
            throw new Error("Error in JWT signing: " + err.message)
        }

        return base64str;
    }

    base64urlDecode(str) {
        return Buffer.from(this.base64urlUnescape(str), 'base64').toString();
    }

    base64urlUnescape(str) {
        str += new Array(5 - str.length % 4).join('=');
        return str.replace(/\-/g, '+').replace(/_/g, '/');
    }

    base64urlEncode(str) {
        return this.base64urlEscape(Buffer.from(str).toString('base64'));
    }

    base64urlEscape(str) {
        return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
}
