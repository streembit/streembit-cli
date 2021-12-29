

'use strict';

import { BC_VALIDATETXN_PARAMS, BC_VALIDATETXN_HASHPARAM, BC_INVALID_BLOCK, BC_VALIDATEBLOCK_NOTXNS, SUCCESS } from 'streembit-errcodes';
import { rootdir } from 'libs/config';

import { Block } from '../bcjs';
import { Transaction } from '../bcjs';
import * as bcdb from '../bcdatabase/index';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from "fs";
import { join } from 'path';

import { eachSeries, waterfall, each } from 'async';

class BcNode {
    constructor() {
    }

    static ValidateTransaction(txhex, txhash, txid) {
        if (!txhex || !txhash || !txid) {
            return BC_VALIDATETXN_PARAMS;
        }
        var tx = Transaction.fromHex(txhex);
        if (tx.getHashHex() != txhash) {
            return BC_VALIDATETXN_HASHPARAM;
        }
        return tx.validate();
    }

    static ValidateBlock(data, blocklist) {

        const getPreviousBlock = function (prevhash) {
            var prevblock;
            for (let i = 0; i < blocklist.length; i++) {
                if (prevhash == blocklist[i].blockid) {
                    prevblock = blocklist[i];
                }
            }
            return prevblock;
        }

        var block = data.block;
        if (!block) {
            return BC_INVALID_BLOCK;
        }
        if (!block.transactions || !block.transactions.length) {
            return BC_VALIDATEBLOCK_NOTXNS;
        }

        // get the previous block
        var prevblock = getPreviousBlock(block.prevhash);

        return block.validate(data.transactions, prevblock);

        //
    }

    static GetDB(blocknos, callback) {
        try {
            var result = {};

            const getblockidx = function (done) {
                result.blockidx = [];

                eachSeries(blocknos, (blockno, cb) => {
                    bcdb.getBlockIdx(blockno, (err, data) => {
                        if (err) {
                            return cb(err);
                        }
                        result.blockidx.push({ blockno: blockno, blockid: data });
                        cb();
                    });
                },
                    (err) => {
                        done(err);
                    });
            };

            const txnsbyblockno = function (done) {
                result.txns = [];

                eachSeries(blocknos, (blockno, cb) => {
                    bcdb.getTxnsByBlockno(blockno, (err, data) => {
                        if (err) {
                            return cb(err);
                        }
                        result.txns.push({ blockno: blockno, txns: data });
                        cb();
                    });
                },
                    (err) => {
                        done(err);
                    });
            };

            const getutxos = function (done) {
                result.utxos = [];
                var txns = [];
                result.txns.forEach(
                    (item) => {
                        txns = txns.concat(item.txns);
                    }
                );

                eachSeries(txns, (txn, cb) => {
                    let txnid = txn.txnid;
                    bcdb.getUtxosByTxnId(txnid, (err, data) => {
                        if (err) {
                            var outputs;
                            if (err.status == 404 || err.name.indexOf("NotFound") > -1) {
                                outputs = [];
                            }
                            else {
                                return cb(err);
                            }
                        }
                        else {
                            outputs = JSON.parse(data);
                        }
                        result.utxos.push({ txnid: txnid, outputs: outputs });
                        cb();
                    });
                },
                    (err) => {
                        done(err);
                    });
            };

            waterfall(
                [
                    getblockidx,
                    txnsbyblockno,
                    getutxos
                ],
                (err) => {
                    callback(err, result);
                }
            );
        }
        catch (err) {
            callback(err);
        }
    }

    static BuildDB(blocknos, callback) {

        if (!rootdir) {
            throw new Error("global rootdir is missing");
        }

        var filedir = join(rootdir, "bcfiles");

        var blocklist = [];

        const readBlocks = function (done) {

            eachSeries(blocknos, (blockno, cb) => {
                var data = BcNode.GetBlockFileData(blockno);
                console.log("blockno: " + blockno + " " + data.blockid);
                data.block = Block.fromHex(data.blockhex);
                data.transactions.forEach(
                    (transaction) => {
                        transaction.txn = Transaction.fromHex(transaction.txnhex);
                    }
                );
                blocklist.push(data);
                return cb();
            },
                (err) => {
                    done(err);
                }
            );
        };

        const validateBlocks = function (done) {
            eachSeries(
                blocklist,
                (block, cb) => {
                    let result = BcNode.ValidateBlock(block, blocklist);
                    if (result != SUCCESS) {
                        return cb("block validate errno: " + result);
                    }
                    cb();
                },
                (err) => {
                    done(err);
                }
            );
        };

        const addBlocks = function (done) {
            eachSeries(
                blocklist,
                (block, cb) => {
                    let blockno = block.blockno;
                    let blockid = block.blockid
                    let blockhex = block.blockhex;
                    let transactions = block.transactions;
                    transactions.forEach(
                        (transaction) => {
                            transaction.blockno = blockno;
                            transaction.blockid = blockid;
                        }
                    );

                    BcNode.AddBlock(blockno, blockid, blockhex, transactions, cb);
                },
                (err) => {
                    done(err);
                }
            );
        };

        const validateUtxos = function (done) {

            let transobjs = [];

            blocklist.forEach(
                (block) => {
                    block.transactions.forEach(
                        (transaction) => {
                            transaction.txn.createUtxos();
                            if (transaction.txn.utxoparam && transaction.txn.utxoparam.totalout && transaction.txn.utxoparam.redeems && transaction.txn.utxoparam.redeems.length) {
                                transobjs.push(transaction.txn);
                            }
                        }
                    );
                }
            );

            if (!transobjs.length) {
                return done();
            }

            const validate = function (transaction, cbfunc) {
                bcdb.validateUtxos(transaction, cbfunc);
            }

            // validate the UTXOs in the database
            each(
                transobjs,
                validate,
                (err, result) => {
                    done(err);
                }
            );
        };

        const validateForging = function (done) {
            // TODO validate the forging rights, etc.
            done();
        };

        waterfall(
            [
                readBlocks,
                validateBlocks,
                validateForging,
                validateUtxos,
                addBlocks
            ],
            (err, result) => {
                callback(err);
            }
        );
    }

    static getTxnFromHex(txhex) {
        return Transaction.fromHex(txhex);
    }

    static getBlockFromHex(blockhex) {
        var block = Block.fromHex(blockhex);
        return block;
    }

    static CreateBlockFile(blockno, blockid, blockhex, txns) {
        if (!rootdir) {
            throw new Error("rootdir in config is missing");
        }

        if (!Number.isInteger(blockno) || blockno < 0 || !blockid || !blockhex || !txns || !txns.length) {
            throw new Error("CreateBlockFile parameters");
        }

        var data = {
            "blockno": blockno,
            "blockid": blockid,
            "blockhex": blockhex,
            "transactions": []
        };

        txns.forEach(
            (txn) => {
                data.transactions.push({
                    txnid: txn.txid,
                    txnhash: txn.txhash,
                    txnhex: txn.txhex
                });
            }
        );

        var ftext = JSON.stringify(data);

        var filedir = join(rootdir, "bcfiles");
        var numstr = (new String(blockno)).toString();
        var filename = "block" + numstr.padStart(8, "0") + ".dat";
        var filepath = join(filedir, filename);

        if (existsSync(filepath)) {
            unlinkSync(filepath);
        }

        writeFileSync(filepath, ftext, "ascii");

        //
    }

    // gets the static genesis blok from the output file
    // the caller must pass the filepath param
    static GetBlockFileData(blockno, callback) {
        if (!rootdir) {
            throw new Error("global rootdir is missing");
        }
        var filedir = join(rootdir, "bcfiles");
        var str = blockno + "";
        var filename = "block" + str.padStart(8, "0") + ".dat";
        var filepath = join(filedir, filename);

        var ftext = readFileSync(filepath);
        var data = JSON.parse(ftext);

        /*
        var data = {           
            blockid: "",
            blockhex: "",
            transactions: []
        };
        var txn = {
            txnhex: "",
            txnhash: "",
            txnid: ""
        };

        
        var inputStream = fs.createReadStream(filepath);
        var lineReader = readline.createInterface({
            input: inputStream
        });

        inputStream.on("error", (err) => {
            return callback(err);
        });

        var i=0
        lineReader.on('line', function(line) {
            switch (i) {
                case 0:
                    data.blockno = Number.parseInt(line);    // first line in the file is the Block height
                    break;
                case 1:
                    data.blockid = line;        // first line in the file is the Block ID
                    break;
                case 2:
                    data.blockhex = line;       // second line in the file is the Block HEX
                    break;
                case 3:                   
                    txn.txnhex = line;          // third line in the file is the Transaction HEX
                    break;
                case 4:                    
                    txn.txnhash = line;         // fourth line in the file is the Transaction hash
                    break;
                case 5:                    
                    txn.txnid = line;           // sixth line in the file is the Transaction ID     
                    break;
                default:
                    break;
            };

            i++;

            if (i == 6) {
                data.transactions.push(txn);
                // there must be 6 lines in teh genesis static file
                return callback(null, data);
            }
        });
        */

        return data;
    }

    static AddBlock(blockno, blockid, blockhex, transactions, callback) {
        bcdb.addBlock(blockno, blockid, blockhex, transactions, callback);
    }

    static GetBlock(blockhash, callback) {
        bcdb.getBlock(blockhash, callback);
    }

    static ReadDB(bcindexes, callback) {
        bcdb.readBC(bcindexes, callback);
    }

    static FindItem(item, callback) {
        bcdb.findItem(item, callback);
    }

    static GetBlockno(blockno, callback) {
        bcdb.getBlockno(blockno, callback);
    }
}

export default BcNode;