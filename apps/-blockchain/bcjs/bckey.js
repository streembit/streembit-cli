
import * as baddress from './address.js';
import * as bcrypto from './crypto.js';
import * as typeforce from 'typeforce';
import * as types from './types.js';
import * as wif from 'wif';
import { ec as EC } from 'elliptic';
import { Buffer } from 'safe-buffer';
import { bs58check } from 'bs58check';
import { createHash } from 'create-hash';

import { osmio } from './networks.js';

class BcKey {
    constructor(options) {

        if (options) {
            typeforce({
                compressed: types.maybe(types.Boolean),
                network: types.maybe(types.Network)
            }, options);
        }

        options = options || {};

        this.compressed = options.compressed === undefined ? true : options.compressed;
        this.network = options.network || osmio;

        if (!options.curve) {
            options.curve = 'secp256k1';
        }

        this.key = null;

        this.ecclib = new EC(options.curve);

        if (options.entropy) {
            this.key = this.ecclib.genKeyPair({
                entropy: options.entropy
            });
        }
        else if (options.privatekey) {
            this.key = this.ecclib.keyFromPrivate(options.privatekey, options.enc || null);
        }
        else if (options.publickey) {
            this.key = this.ecclib.keyFromPublic(options.publickey);
        }
        else if (options.publickehex) {
            this.key = this.ecclib.keyFromPublic(options.publickehex, 'hex');
        }
    }
    toWIF() {
        if (!this.key)
            throw new Error('Missing ecc key pair');

        let privhex = this.privateKeyHex;
        let buffer = Buffer.from(privhex, "hex");
        return wif.encode(this.network.wif, buffer, this.compressed);
    }
    getAddress(version) {
        let buffer = this.getPublicKeyBuffer();
        if (!version) {
            version = this.getNetwork().pubKeyHash;
        }
        return baddress.toBase58Check(bcrypto.hash160(buffer), version);
    }
    getP2SHAddress() {
        let buffer = this.getPublicKeyBuffer();
        return baddress.toBase58Check(bcrypto.hash160(buffer), this.getNetwork().scriptHash);
    }
    getNetwork() {
        return this.network;
    }
    getPublicKeyBuffer() {
        let buffer = Buffer.from(this.publicKeyHex, "hex");
        return buffer;
    }
    sign(msg, enc, options) {
        if (!this.key)
            throw new Error('Missing ecc key pair');

        return this.key.sign(msg, enc, options);
    }
    verify(msg, signature) {
        if (!this.key)
            throw new Error('Missing ecc key pair');

        return this.key.verify(msg, signature);
    }
    recoverPubKey(msg, signature, j, enc) {
        if (!this.ecclib)
            throw new Error('EC library is not initialized');

        return this.ecclib.recoverPubKey(msg, signature, j, enc);
    }
    static fromPublicKeyHex(pkey) {
        return new BcKey({
            publickehex: pkey
        });
    }
    static fromPublicKeyBuffer(buffer) {
        return new BcKey({
            publickey: buffer
        });
    }
    static fromPrivateKey(key, enc) {
        return new BcKey({
            privatekey: key,
            enc: enc
        });
    }
    static fromWIF(string, network) {
        let decoded = wif.decode(string);
        let version = decoded.version;

        // list of networks?
        if (types.Array(network)) {
            network = network.filter(function (x) {
                return version === x.wif;
            }).pop();

            if (!network)
                throw new Error('Unknown network version');
        } else {
            network = network || osmio;
            if (version !== network.wif)
                throw new Error('Invalid network version');
        }

        return new BcKey({
            compressed: decoded.compressed,
            network: network,
            privatekey: decoded.privateKey
        });
    }
    get publicKeyHex() {
        return this.key.getPublic(this.compressed, "hex");
    }
    get publicKeyID() {
        let buffer = this.getPublicKeyBuffer();
        return createHash('rmd160').update(buffer).digest('hex');
    }
    get encodedPublicKey() {
        let buffer = this.getPublicKeyBuffer();
        let bs58hash = bs58check.encode(buffer);
        return bs58hash;
    }
    get privateKey() {
        return this.key.getPrivate();
    }
    get privateKeyHex() {
        return this.key.getPrivate('hex');
    }
    get curve() {
        return this.ecclib ? this.ecclib.curve : null;
    }
}


export default BcKey;