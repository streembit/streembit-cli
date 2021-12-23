
import { Buffer } from 'safe-buffer';
import * as  bcrypto from './crypto.js';

import * as fastMerkleRoot from '../merkle-lib/fastRoot.js';
import typeforce from 'typeforce';
console.log("=====typeforce===", typeforce);
import * as types from './types.js';
import * as  errcodes from 'streembit-errcodes';
import { defs as constants } from './constants.js';

const BUFLEN = 76;

class Block {
    constructor() {
        this.version = 1;
        this.prevhash = 0;
        this.merkleroot = 0;
        this.timestamp = Date.now();
        this.transactions = [];
    }
    validate(txnslist, prevblock) {
        try {
            if (!prevblock && this.prevhash != constants.genesis_prevblock) {
                // only the genesis block could have no previous block
                return errcodes.BC_INVALID_PREVBLOCK;
            }

            let txnobjlist = [];

            for (let i = 0; i < txnslist.length; i++) {
                let transaction = txnslist[i];
                if (!transaction.txnhex || !transaction.txnhash || !transaction.txnid) {
                    return errcodes.BC_INPUTVALIDATE_PARAMS;
                }
                let tx = transaction.txn;
                if (tx.getHashHex() != transaction.txnhash) {
                    return errcodes.BC_INPUTVALIDATE_TXHASH;
                }

                // add it to the transaction list so later we can verify the merkle root
                txnobjlist.push(tx);

                let result = tx.validate();
                if (result != errcodes.SUCCESS) {
                    return result;
                }
            }

            if (!this.merkleroot) {
                return errcodes.BC_INVALID_MERKLEROOT;
            }

            // merkle root must be a buffer
            let merklebuf = Buffer.from(this.merkleroot, "hex");
            this.merkleroot = merklebuf;

            // the transactions are valid, check the merkle root
            this.transactions = txnobjlist;
            let valid = this.checkMerkleRoot();
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
    byteLength(headersOnly) {
        this.toBuffer().length;
    }
    getHash() {
        return bcrypto.hash256(this.toBuffer(true));
    }
    getId() {
        return this.getHash().reverse().toString('hex');
    }
    getUTCDate() {
        let date = new Date(this.timestamp);
        return date;
    }
    toBuffer(headersOnly) {
        let blockobj = {
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

        let buffer = Buffer.from(JSON.stringify(blockobj));
        return buffer;
    }
    toHex(headersOnly) {
        return this.toBuffer(headersOnly).toString('hex');
    }
    checkMerkleRoot() {
        if (!this.transactions)
            return false;

        let actualMerkleRoot = Block.calculateMerkleRoot(this.transactions);
        return this.merkleroot.compare(actualMerkleRoot) === 0;
    }
    static fromBuffer(buffer) {
        if (buffer.length < BUFLEN)
            throw new Error('Buffer too small < ' + BUFLEN + ' bytes');
        let obj = JSON.parse(buffer.toString());
        let block = Object.assign(new Block(), obj);
        return block;
    }
    static fromHex(hex) {
        return Block.fromBuffer(Buffer.from(hex, 'hex'));
    }
    static calculateMerkleRoot(transactions) {
        typeforce([{
            getHash: types.Function
        }], transactions);

        if (transactions.length === 0)
            throw TypeError('Cannot compute merkle root for zero transactions');

        let hashes = transactions.map(function (transaction) {
            return transaction.getHash();
        });

        return fastMerkleRoot(hashes, bcrypto.hash256);
    }
}












Block.BUFLEN = BUFLEN;

export default Block;