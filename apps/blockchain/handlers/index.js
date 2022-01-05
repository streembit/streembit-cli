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
import { getLastBlockno } from './bcdatabase';
import { BcKey } from './bcjs/index.js';
import { GetBlockFileData, CreateBlockFile, getTxnFromHex, getBlockFromHex } from './bcnode';
import NodeInfo from './bcnode/nodeinfo';
import ForgeTxn from './bcjs/txns/forge';
import { Block } from './bcjs/index.js';
import Account from "libs/account";
import GenesisTxnHandler from './bcjs/txns/genesis';
import ForgeTxnHandler from './bcjs/txns/forge';

let bckey = 0;

// collect the transactions in this array
let list_of_transactions = [];
let last_block_time = 0;


function createBlock() {
    let currtime = Date.now();
    if (currtime - last_block_time < 60000 || list_of_transactions.length < 1) return;

    logger.debug("create block ...");

    // get the last block number
    getLastBlockno(
        (err, lastblockno) => {
            if (err) {
                return logger.error("getLastBlockno " + err);
            }

            logger.debug("lastblockno: " + lastblockno);

            let blockdata = GetBlockFileData(lastblockno);
            let params = {
                starttime: Date.now(),
                prevblock: blockdata.blockid,
                bckey: bckey
            };
            let nodeinfo = Object.assign(new NodeInfo(), params);
            let forgeinfo = nodeinfo.forgeNodeInfo();
            let tx = ForgeTxn(bckey, getForgeAddress(), 1000, forgeinfo);
            let txhex = tx.toHex();
            let txhash = tx.getHashHex()
            let txid = tx.getId();

            let forgetxn = [tx];

            let merkleroot = Block.calculateMerkleRoot([tx]);
            let block = new Block();
            block.prevhash = blockdata.blockid;
            block.merkleroot = merkleroot;
            block.version = 1;
            block.timestamp = Date.now();

            block.transactions = forgetxn.concat(list_of_transactions);
            list_of_transactions = [];
            forgetxn = null;

            let blockhex = block.toHex();
            let blockid = block.getId();

            let blockno = lastblockno + 1;
            CreateBlockFile(blockno, txhex, txhash, txid, blockid, blockhex);

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

        let bckey = BcKey.fromPrivateKey(privkhex, "hex");
        let tx = GenesisTxnHandler(bckey);

        let txhex = tx.toHex();
        let txhash = tx.getHashHex()
        let txid = tx.getId();

        let merkleroot = Block.calculateMerkleRoot([tx]);
        let block = new Block();
        block.prevhash = ''.padStart(32, "0");
        block.merkleroot = merkleroot;
        block.version = 1;
        block.timestamp = Date.now();
        block.transactions.push(tx);
        let blockhex = block.toHex();
        let blockid = block.getId();
        let transactions = [
            { txhex: txhex, txhash: txhash, txid: txid }
        ];

        CreateBlockFile(0, blockid, blockhex, transactions);

        // verify
        console.log("verify");

        let data = GetBlockFileData(0);
        console.log(data.blockid == blockid);
        let importtx = getTxnFromHex(data.transactions[0].txnhex);
        console.log(txhash == importtx.getHashHex());
        let importblock = getBlockFromHex(data.blockhex);
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

        let bckey = BcKey.fromPrivateKey(privkeyHex, "hex");

        let blockdata = GetBlockFileData(blockNo - 1);
        let params = {
            starttime: Date.now(),
            prevblock: blockdata.blockid,
            bckey: bckey
        };
        let nodeinfo = Object.assign(new NodeInfo(), params);
        let forgeinfo = nodeinfo.forgeNodeInfo();
        let tx = ForgeTxnHandler(bckey, forgeAddress, amount, forgeinfo);
        let txhex = tx.toHex();
        let txhash = tx.getHashHex()
        let txid = tx.getId();

        let merkleroot = Block.calculateMerkleRoot([tx]);
        let block = new Block();
        block.prevhash = blockdata.blockid;
        block.merkleroot = merkleroot;
        block.version = 1;
        block.timestamp = Date.now();
        block.transactions.push(tx);
        let blockhex = block.toHex();
        let blockid = block.getId();

        let transactions = [
            { txhex: txhex, txhash: txhash, txid: txid }
        ];

        CreateBlockFile(blockNo, blockid, blockhex, transactions);
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

}


class Handler {
    constructor() {
    }

    init(callback) {
        try {
            let account = new Account();
            bckey = account.cryptokey;

            events.register(events.ONBCEVENT, onBcEvent);

            // start the timer to monitor incoming transaction
            setInterval(
                () => {
                    createBlock();
                },
                20000
            );

            return callback();
        }
        catch (err) {
            logger.error("apps/blockchain/handlers/index Handler error: " + err.message);
            callback(err);
        }
    }
}

export default Handler;
