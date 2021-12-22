'use strict';

const errcodes = require('streembit-errcodes');
const constants = require('../bcjs/constants');
const bccrypto = require('../bcjs/crypto');
const matchscore = require('../utils/matchscore');

class NodeInfo {
    constructor() {
        this.starttime = 0;
        this.prevblock = 0;
        this.distance = 0; // default 0 -> must be calculated as 0 value is refused by the blockchain 
        this.bckey = 0;
    }

    forgeNodeInfo() {
        var obj = {
            nodeid: this.bckey.publicKeyID,
            publickey: this.bckey.publicKeyHex,
            starttime: this.starttime,
            prevblock: this.prevblock,
            distance: this.getScore()
        }

        return obj;
    }

    getScore() {
        if (!this.prevblock || typeof this.prevblock != "string" || this.prevblock.length < 32) {
            throw new Error("invalid getScore prevblock param");
        }
        // create a SHA512 hash from the cmpval (previous block hash)
        var blockhash = bccrypto.sha512(this.prevblock);
        // create a SHA512 hash from the Node ID
        var idhash = bccrypto.sha512(this.bckey.publicKeyHex);
        return matchscore(blockhash.toString("hex"), idhash.toString("hex"));
    }

    get info() {

    }
}

module.exports = NodeInfo;