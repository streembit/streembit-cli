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
Author: Streembit 
Copyright (C) 2018 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


import { logger, events } from "streembit-util";
import * as bcdb from './bcdatabase';

const BcKey = require('./bcjs/index.js').BcKey;
const BcNode = require('./bcnode');
const NodeInfo = require('./bcnode/nodeinfo');
const ForgeTxn = require('./bcjs/txns/forge');
const Block = require('./bcjs/index.js').Block;
const Account = require("libs/account");
const GenesisTxnHandler = require('./bcjs/txns/genesis');
const ForgeTxnHandler = require('./bcjs/txns/forge');

var bckey = 0;

// collect the transactions in this array
var list_of_transactions = [];
var last_block_time = 0;


function createBlock() {
    var currtime = Date.now();
    if (currtime - last_block_time < 60000 || list_of_transactions.length < 1) return;

    logger.debug("create block ...");

    // get the last block number
    bcdb.getLastBlockno(
        (err, lastblockno) => {
            if (err) {
                return logger.error("getLastBlockno " + err);
            }

            logger.debug("lastblockno: " + lastblockno);

            var blockdata = BcNode.GetBlockFileData(lastblockno);
            var params = {
                starttime: Date.now(),
                prevblock: blockdata.blockid,
                bckey: bckey
            };
            var nodeinfo = Object.assign(new NodeInfo(), params);
            var forgeinfo = nodeinfo.forgeNodeInfo();
            var tx = ForgeTxn(bckey, getForgeAddress(), 1000, forgeinfo);
            var txhex = tx.toHex();
            var txhash = tx.getHashHex()
            var txid = tx.getId();

            var forgetxn = [tx];

            var merkleroot = Block.calculateMerkleRoot([tx]);
            var block = new Block();
            block.prevhash = blockdata.blockid;
            block.merkleroot = merkleroot;
            block.version = 1;
            block.timestamp = Date.now();

            block.transactions = forgetxn.concat(list_of_transactions);
            list_of_transactions = [];
            forgetxn = null;

            var blockhex = block.toHex();
            var blockid = block.getId();

            var blockno = lastblockno + 1;
            BcNode.CreateBlockFile(blockno, txhex, txhash, txid, blockid, blockhex);

            // at end -> remove the processed transactions from list_of_transactions
            last_block_time = Date.now();

            //
        }
    );
}


function CreateGenesis(privkhex, callback) {
    try {
        if (!callback) {
            callback = (err) => {
                logger.error(`cmd genesis error: ${err}`)
            }
        }

        var bckey = BcKey.fromPrivateKey(privkhex, "hex");
        var tx = GenesisTxnHandler(bckey);

        var txhex = tx.toHex();
        var txhash = tx.getHashHex()
        var txid = tx.getId();

        var merkleroot = Block.calculateMerkleRoot([tx]);
        var block = new Block();
        block.prevhash = ''.padStart(32, "0");
        block.merkleroot = merkleroot;
        block.version = 1;
        block.timestamp = Date.now();
        block.transactions.push(tx);
        var blockhex = block.toHex();
        var blockid = block.getId();
        var transactions = [
            { txhex: txhex, txhash: txhash, txid: txid }
        ];

        BcNode.CreateBlockFile(0, blockid, blockhex, transactions);

        // verify
        console.log("verify");

        var data = BcNode.GetBlockFileData(0);
        console.log(data.blockid == blockid);
        var importtx = BcNode.getTxnFromHex(data.transactions[0].txnhex);
        console.log(txhash == importtx.getHashHex());
        var importblock = BcNode.getBlockFromHex(data.blockhex);
        console.log(blockid == importblock.getId());

        callback();
    }
    catch (err) {
        callback(err.message);
    }
}

function ForgeTransaction(blockNo, privkeyHex, forgeAddress, amount, callback) {
    try {
        if (!Number.isInteger(blockNo) || blockNo <= 0) { // 0 is the Genesis block
            throw new Error("invalid block number");
        }
        if (!Number.isInteger(amount)) {
            throw new Error("invalid amount");
        }
        if (!privkeyHex) {
            throw new Error("invalid private key");
        }
        if (!forgeAddress) {
            throw new Error("invalid address");
        }

        var bckey = BcKey.fromPrivateKey(privkeyHex, "hex");

        var blockdata = BcNode.GetBlockFileData(blockNo - 1);
        var params = {
            starttime: Date.now(),
            prevblock: blockdata.blockid,
            bckey: bckey
        };
        var nodeinfo = Object.assign(new NodeInfo(), params);
        var forgeinfo = nodeinfo.forgeNodeInfo();
        var tx = ForgeTxnHandler(bckey, forgeAddress, amount, forgeinfo);
        var txhex = tx.toHex();
        var txhash = tx.getHashHex()
        var txid = tx.getId();

        var merkleroot = Block.calculateMerkleRoot([tx]);
        var block = new Block();
        block.prevhash = blockdata.blockid;
        block.merkleroot = merkleroot;
        block.version = 1;
        block.timestamp = Date.now();
        block.transactions.push(tx);
        var blockhex = block.toHex();
        var blockid = block.getId();

        var transactions = [
            { txhex: txhex, txhash: txhash, txid: txid }
        ];

        BcNode.CreateBlockFile(blockNo, blockid, blockhex, transactions);
        callback()
    }
    catch (err) {
        callback(err.message);
    }
}

function onBcEvent(payload, callback) {
    if (!payload || !payload.type) return;

    try {
        switch (payload.type) {
            case "addtxn":
                //console.log(util.inspect(payload));
                // must be a transaction object
                if (payload.txn) {
                    list_of_transactions.push(payload.txn);
                }
                break;
            case "addgenesis":
                //console.log(util.inspect(payload));
                // must be a transaction object
                CreateGenesis(payload.privkeyhex, callback);
                break;
            case "forgetxn":
                //console.log(util.inspect(payload));
                // must be a transaction object
                ForgeTransaction(payload.blockno, payload.privkeyhex, payload.address, payload.amount, callback);
                break;
            default:
                break;
        }
    }
    catch (err) {
        logger.error("onBcEvent error: " + err.message);
    }
}

function TxnMonitor(payload, callback) {
    setInterval(
        () => {
            createBlock();
        },
        20000
    );
}


class Blockchain {
    constructor() {
    }


    async init(callback) {
        try {
            var account = new Account();
            bckey = account.cryptokey;

            events.register(events.ONBCEVENT, onBcEvent);

            // start the timer to monitor incoming transaction
            TxnMonitor();

            return callback();
        }
        catch (err) {
            logger.error("Blockchain init error: " + err.message);
            callback(err);
        }
    }
}

module.exports = Blockchain;
