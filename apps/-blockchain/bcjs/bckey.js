const baddress = require('./address');
const bcrypto = require('./crypto');
const randomBytes = require('randombytes');
const typeforce = require('typeforce');
const types = require('./types');
const wif = require('wif');
const EC = require('elliptic').ec;
const Buffer = require('safe-buffer').Buffer;
const bs58check = require('bs58check');
const createHash = require('create-hash')

var NETWORKS = require('./networks')

function BcKey(options) {

    if (options) {
        typeforce({
            compressed: types.maybe(types.Boolean),
            network: types.maybe(types.Network)
        }, options);
    }

    options = options || {}

    this.compressed = options.compressed === undefined ? true : options.compressed
    this.network = options.network || NETWORKS.osmio;

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

BcKey.fromPublicKeyHex = function (pkey) {
    return new BcKey({
        publickehex: pkey
    })
};

BcKey.fromPublicKeyBuffer = function (buffer) {
    return new BcKey({
        publickey: buffer
    })
}

BcKey.fromPrivateKey = function (key, enc) {
    return new BcKey({
        privatekey: key,
        enc: enc
    })
}

BcKey.fromWIF = function (string, network) {
    var decoded = wif.decode(string)
    var version = decoded.version

    // list of networks?
    if (types.Array(network)) {
        network = network.filter(function (x) {
            return version === x.wif
        }).pop()

        if (!network) throw new Error('Unknown network version')
    } else {
        network = network || NETWORKS.osmio;
        if (version !== network.wif) throw new Error('Invalid network version')
    }

    return new BcKey({
        compressed: decoded.compressed,
        network: network,
        privatekey: decoded.privateKey
    })
}

BcKey.prototype.toWIF = function () {
    if (!this.key) throw new Error('Missing ecc key pair')

    var privhex = this.privateKeyHex;
    var buffer = Buffer.from(privhex, "hex");
    return wif.encode(this.network.wif, buffer, this.compressed)
}

BcKey.prototype.getAddress = function (version) {
    var buffer = this.getPublicKeyBuffer();
    if (!version) {
        version = this.getNetwork().pubKeyHash;
    }
    return baddress.toBase58Check(bcrypto.hash160(buffer), version)
}

BcKey.prototype.getP2SHAddress = function () {
    var buffer = this.getPublicKeyBuffer();
    return baddress.toBase58Check(bcrypto.hash160(buffer), this.getNetwork().scriptHash)
}

BcKey.prototype.getNetwork = function () {
    return this.network
}

BcKey.prototype.getPublicKeyBuffer = function () {
    var buffer = Buffer.from(this.publicKeyHex, "hex");
    return buffer;
}


Object.defineProperty(BcKey.prototype, 'publicKeyHex', {
    get: function () {
        return this.key.getPublic(this.compressed, "hex");
    }
})

Object.defineProperty(BcKey.prototype, 'publicKeyID', {
    get: function() {
        var buffer = this.getPublicKeyBuffer();
        return createHash('rmd160').update(buffer).digest('hex');
    }
})

Object.defineProperty(BcKey.prototype, 'encodedPublicKey', {
    get: function () {
        var buffer = this.getPublicKeyBuffer();
        var bs58hash = bs58check.encode(buffer);
        return bs58hash;
    }
})

Object.defineProperty(BcKey.prototype, 'privateKey', {
    get: function () {
        return this.key.getPrivate();
    }
})

Object.defineProperty(BcKey.prototype, 'privateKeyHex', {
    get: function () {
        return this.key.getPrivate('hex');
    }
})

BcKey.prototype.sign = function (msg, enc, options) {
    if (!this.key) throw new Error('Missing ecc key pair')

    return this.key.sign(msg, enc, options)
}

BcKey.prototype.verify = function (msg, signature) {
    if (!this.key) throw new Error('Missing ecc key pair')

    return this.key.verify(msg, signature);
}

BcKey.prototype.recoverPubKey = function (msg, signature, j, enc) {
    if (!this.ecclib) throw new Error('EC library is not initialized');

    return this.ecclib.recoverPubKey(msg, signature, j, enc);
}

Object.defineProperty(BcKey.prototype, 'curve', {
    get: function () {
        return this.ecclib ? this.ecclib.curve : null;
    }
})

module.exports = BcKey;