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

import aes from "browserify-aes";
import elliptic from "elliptic";

const EC = elliptic.ec;
const DEFAULT_CURVE = 'secp256k1';

class JWE {
    createSymmetricSey(master_key, other_public_key) {
        const shared = master_key.derive(other_public_key);
        const symmkey = shared.toString(16);
        return symmkey;
    }

    base64urlDecode(str) {
        return Buffer.from(base64urlUnescape(str), 'base64').toString();
    }

    base64urlUnescape(str) {
        str += new Array(5 - str.length % 4).join('=');
        return str.replace(/\-/g, '+').replace(/_/g, '/');
    }

    base64urlEncode(str) {
        return base64urlEscape(Buffer.from(str).toString('base64'));
    }

    base64urlEscape(str) {
        return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    /*
     encoded_rcpt_pk: must be a hex encoded ECC public key
    */
    encrypt(master_key, encoded_rcpt_pk, data) {
        let rcpt_pk;
        try {
            var ec = new EC(DEFAULT_CURVE);
            rcpt_pk = ec.keyFromPublic(encoded_rcpt_pk, 'hex').getPublic();
        } catch (e) {
            throw new Error("ECDH encrypt error. Invalid public key, error: " + e.message);
        }

        const secret = this.createSymmetricSey(master_key, rcpt_pk);
        const cipher = aes.createCipher('aes256', secret);
        let cipher_text = cipher.update(data, 'utf8', 'base64');
        cipher_text += cipher.final('base64');
            
        //  Create a JWE structure by combining a JWE header and the cipher text
        //  Please note the A256KW in this implementation of WoT refers to the AES 256 algorithm and
        //  the key is not wrapped (as it is generated with Diffie-Hellman. The "KW" is kept to use a 
        //  standard value in the "enc" field.
        //  This implementation do not use a JWE Encrypted Key - the symmetric encryption key is a
        //  Diffie-Hellman key exchange secret. For increased security and fully comply with JWE standard
        //  future implementations could use a JWE Encrypted session key
        const header = { "alg": "ECDH-ES", "enc": "A256KW" };
        let segments = [];
        segments.push(base64urlEncode(JSON.stringify(header)));
        // the cipher is already Base64 encoded, only need to URL escape
        segments.push(base64urlEscape(cipher_text));
        const result = segments.join('.');
            
        return result;
    }

    /*
     encoded_rcpt_pk: must be a hex encoded ECC public key
    */
    decrypt(master_key, encoded_rcpt_key, jwe_input) {
        //  Parse the JWE structure
        //  The input must include at least two Base64 encoded segments divided by a a "." as
        //  per the JWE standard definition
        const segments = jwe_input.split('.');
        if (segments.length !== 2) {
            throw new Error('JWE parse error: invalid segment count');
        }
        
        // All segment should be base64
        const headerSeg = segments[0];
        const cipherSeg = segments[1];
        
        // base64 decode and parse JSON
        const header = JSON.parse(base64urlDecode(headerSeg));
        //  The payload was only URL escaped, see above the encryption method, need to URL unescape it
        const cipher_text = base64urlUnescape(cipherSeg);
        
        if (!header || !header.alg) {
            throw new Error('JWE parse error: invalid header alg field');
        }
        
        if (header.alg.indexOf("ECDH") > -1) {
            let rcpt_pk;
            try {
                const ec = new EC(DEFAULT_CURVE);
                rcpt_pk = ec.keyFromPublic(encoded_rcpt_key, 'hex').getPublic();
            } catch (e) {
                throw new Error("ECDH encrypt error. Invalid public key, error: " + e.message);
            }

            const secret = this.createSymmetricSey(master_key, rcpt_pk);
            const decipher = aes.createDecipher('aes256', secret);
            let plain_text = decipher.update(cipher_text, 'base64', 'utf8');
            plain_text += decipher.final();
            
            return plain_text;
        } else {
            //  TODO implement here the support for RSA
            throw new Error("Invalid crypto alg. Only ECDH is supported on this version of WOT");
        }
    }

    decrypt_ecdh(master_key, sender_public_key, jwe_input) {
        const public_key = ec.keyFromPublic(sender_public_key, 'hex');
        return this.decrypt(master_key, public_key, jwe_input);
    }
    
    aes256decrypt(symmetric_key, cipher_text) {
        const decipher = aes.createDecipher('aes256', symmetric_key);
        let plain_text = decipher.update(cipher_text, 'base64', 'utf8');
        plain_text += decipher.final();
        
        return plain_text;
    }
    
    aes256encrypt(symmetric_key, data) {
        const cipher = aes.createCipher('aes256', symmetric_key);
        let cipher_text = cipher.update(data, 'utf8', 'base64');
        cipher_text += cipher.final('base64');
        
        return cipher_text;
    }

    symmDecrypt(symmetric_key, jwe_input) {
        //  Parse the JWE structure
        //  The input must include at least two Base64 encoded segments divided by a a "." as
        //  per the JWE standard definition
        const segments = jwe_input.split('.');
        if (segments.length !== 2) {
            throw new Error('JWE parse error: invalid segment count');
        }
        
        // All segment should be base64
        const headerSeg = segments[0];
        const cipherSeg = segments[1];
        
        // base64 decode and parse JSON
        const header = JSON.parse(base64urlDecode(headerSeg));
        //  The payload was only URL escaped, see above the encryption method, need to URL unescape it
        const cipher_text = base64urlUnescape(cipherSeg);
        
        if (!header || !header.enc) {
            throw new Error('JWE parse error: invalid header enc field');
        }
        
        if (header.enc.indexOf("A256KW") > -1) {
            const decipher = aes.createDecipher('aes256', symmetric_key);
            let plain_text = decipher.update(cipher_text, 'base64', 'utf8');
            plain_text += decipher.final();
            
            return plain_text;
        } else {
            //  TODO implement here the support for RSA
            throw new Error("Invalid crypto enc. Only A256KW is supported oin this version of the application");
        }
    }
    
    symmEncrypt(symmetric_key, data) {
        
        const cipher = aes.createCipher('aes256', symmetric_key);
        let cipher_text = cipher.update(data, 'utf8', 'base64');
        cipher_text += cipher.final('base64');
        
        const header = { "enc": "A256KW" };
        let segments = [];
        segments.push(base64urlEncode(JSON.stringify(header)));
        // the cipher is already Base64 encoded, only need to URL escape
        segments.push(base64urlEscape(cipher_text));
        const result = segments.join('.');
        
        return result;
    }

}

const _JWE = new JWE();
export { _JWE as jwe };
