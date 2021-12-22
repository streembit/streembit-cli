
import { Buffer } from 'safe-buffer';
const bcrypto = require('./crypto')
const fastMerkleRoot = require('merkle-lib/fastRoot')
import { typeforce } from 'typeforce';
import * as types from './types';
const errcodes = require('streembit-errcodes');
const constants = require('./constants');

const BUFLEN = 76;

function Block() {
    this.version = 1;
    this.prevhash = 0;
    this.merkleroot = 0;
    this.timestamp = Date.now();
    this.transactions = [];
}

Block.prototype.validate = function (txnslist, prevblock) {
    try {
        if (!prevblock && this.prevhash != constants.genesis_prevblock) {
            // only the genesis block could have no previous block
            return errcodes.BC_INVALID_PREVBLOCK;
        }

        var txnobjlist = [];

        for (let i = 0; i < txnslist.length; i++) {
            var transaction = txnslist[i];
            if (!transaction.txnhex || !transaction.txnhash || !transaction.txnid) {
                return errcodes.BC_INPUTVALIDATE_PARAMS;
            }
            var tx = transaction.txn;
            if (tx.getHashHex() != transaction.txnhash) {
                return errcodes.BC_INPUTVALIDATE_TXHASH;
            }

            // add it to the transaction list so later we can verify the merkle root
            txnobjlist.push(tx);

            var result = tx.validate();
            if (result != errcodes.SUCCESS) {
                return result;
            }
        }

        if (!this.merkleroot) {
            return errcodes.BC_INVALID_MERKLEROOT;
        }

        // merkle root must be a buffer
        var merklebuf = Buffer.from(this.merkleroot, "hex");
        this.merkleroot = merklebuf;

        // the transactions are valid, check the merkle root
        this.transactions = txnobjlist;
        var valid = this.checkMerkleRoot();
        if (!valid) {
            return errcodes.BC_MERKLEROOT_NOMATCH;
        }

        return errcodes.SUCCESS;

        //
    }
    catch (err) {
        return errcodes.BC_BLOCKVALIDATE_EXC;
    }
}

Block.fromBuffer = function (buffer) {
    if (buffer.length < BUFLEN) throw new Error('Buffer too small < ' + BUFLEN + ' bytes')
    var obj = JSON.parse(buffer.toString());
    var block = Object.assign(new Block(), obj);
    return block
}

Block.prototype.byteLength = function (headersOnly) {
    this.toBuffer().length;
}

Block.fromHex = function (hex) {
    return Block.fromBuffer(Buffer.from(hex, 'hex'))
}

Block.prototype.getHash = function () {
    return bcrypto.hash256(this.toBuffer(true))
}

Block.prototype.getId = function () {
    return this.getHash().reverse().toString('hex')
}

Block.prototype.getUTCDate = function () {
    var date = new Date(this.timestamp)
    return date
}

Block.prototype.toBuffer = function (headersOnly) {
    var blockobj = {
        version: this.version,
        prevhash: this.prevhash,
        merkleroot: this.merkleroot.toString("hex"),
        timestamp: this.timestamp
    };

    if (!headersOnly && this.transactions.length) {
        blockobj.transactions = [];
        this.transactions.forEach(
            (transaction) => {
                if (typeof transaction === "string") {
                    // this was from hex 
                    blockobj.transactions.push(transaction);
                }
                else {
                    // this is the Transaction object
                    // add the transaction hash to the block
                    blockobj.transactions.push(transaction.getHashHex());
                }
            }
        );
    }

    var buffer = Buffer.from(JSON.stringify(blockobj));
    return buffer;
}

Block.prototype.toHex = function (headersOnly) {
    return this.toBuffer(headersOnly).toString('hex')
}

Block.calculateMerkleRoot = function (transactions) {
    typeforce([{
        getHash: types.Function
    }], transactions);

    if (transactions.length === 0) throw TypeError('Cannot compute merkle root for zero transactions')

    var hashes = transactions.map(function (transaction) {
        return transaction.getHash()
    })

    return fastMerkleRoot(hashes, bcrypto.hash256)
}

Block.prototype.checkMerkleRoot = function () {
    if (!this.transactions) return false

    var actualMerkleRoot = Block.calculateMerkleRoot(this.transactions)
    return this.merkleroot.compare(actualMerkleRoot) === 0
}

Block.BUFLEN = BUFLEN;

module.exports = Block;