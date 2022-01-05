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
Copyright (C) 2018 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const util = require('util');
const dbinstance = require("streembit-db").instance;
const logger = require("streembit-util").logger;
const async = require("async");

const BCBLOCKS = "bcblocks";
const BCUTXOS = "bcutxos";
const BCTXNS = "bctxns";

const HEIGHTPREF = "H";
const TNXPREF = "T";

const singleton = Symbol();
const singleton_verifier = Symbol()

class BcLevelDB {
    constructor(verifier) {   
        if (verifier != singleton_verifier) {
            throw "Constructing Database singleton is not allowed";
        }

        this.lastblockno = 0;
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new BcLevelDB(singleton_verifier);
        }
        return this[singleton];
    }

    db(name) {
        return dbinstance.databases[name];
    }

    getBlockIdx(blockno, callback) {
        try {
            let key = HEIGHTPREF + blockno
            let db = this.db(BCBLOCKS);
            db.get(key, callback);
        }
        catch (e) {
            callback("getBlockIdx  error: " + e.message);
        }
    }

    addBlockNo(blockno, blockid, callback) {
        try {
            let key = HEIGHTPREF + blockno
            let db = this.db(BCBLOCKS);
            db.put(key, blockid, callback);

            this.getLastBlockno(() => { });
        }
        catch (e) {
            callback("addBlockNo  error: " + e.message);
        }  
    }

    getLastBlockno(callback) {
        try {
            var blockno = 0;
            let db = this.db(BCBLOCKS);
            db.createReadStream()
                .on('data', function (data) {
                    try {
                        var key = data.key;
                        if (key[0] == HEIGHTPREF) {
                            var strnum = key.substring(1); // the height prefix always 1 length
                            var num = Number.parseInt(strnum);                            
                            if (blockno < num) {
                                blockno = num;
                            }
                        }
                    }
                    catch (err) {
                        //TODO delete this record
                    }
                })
                .on('error', function (err) {
                    callback(err)
                })
                .on('close', function () {                            
                })
                .on('end', function () {
                    callback(null, blockno);
                    this.lastblockno = 0;
                });
        }
        catch (e) {
            callback("maxBlockHeight error: " + e.message);
        }
    }

    getBlock(blockid, callback) {
        try {
            let db = this.db(BCBLOCKS);
            db.get(blockid, callback);
        }
        catch (err) {
            callback(err);
        }        
    }

    getBlockno(blockno, callback) {
        try {
            this.getBlockIdx(blockno, (err, data) => {
                if (err) {
                    return callback(err);
                }
                let db = this.db(BCBLOCKS);
                db.get(data, callback);
            });           
        }
        catch (err) {
            callback(err);
        }
    }

    getTransaction(txnid, callback) {
        var db = this.db(BCTXNS);
        var key = TNXPREF + txnid;        
        db.get(key, callback);
    }

    findAddr(address, callback) {
        try {
            var result = [];
            let db = this.db(BCTXNS);
            db.createReadStream()
                .on('data', function(data) {
                    try {
                        var dataval = JSON.parse(data.value);
                        let txn = JSON.parse(Buffer.from(dataval.txnhex, "hex"));
                        let exists = false;
                        txn.outputs.forEach(
                            (output) => {
                                if (output.data == address) {
                                    exists = true;
                                }
                            }
                        );
                        if (exists) {
                            dataval.txn = txn;
                            result.push(dataval);
                        }
                    }
                    catch (err) {
                    }
                })
                .on('error', function(err) {
                    callback(err)
                })
                .on('close', function() {
                })
                .on('end', function() {
                    if (!result.length) {
                        // couldn't find this address
                        callback("Not found");
                    }
                    else {
                        callback(null, result);
                    }
                });
        }
        catch (err) {
            callback(err);
        }
    } 

    findItem(item, callback) {
        if (!item || typeof item !== "string" || !item.length) {
            return callback("Unable search for not string item")
        }

        // the item could be a blockhash, transactionid or an address
        // check for all and return when once has succeeded
        async.tryEach(
            [
                (done) => {
                    // try getting by blockid
                    this.getBlock(item, (err, data) => {
                        try {
                            // handle the call back here to parse and return the json string
                            if (err) return done(err);
                            var obj = JSON.parse(data);
                            obj.findval = "blockid"; // the block ID was found
                            done(null, obj);
                        }
                        catch (e) {
                            // TODO report this incorrect data and remove it
                            done(e);
                        }
                    });
                },
                (done) => {
                    //  try getting by transactionid
                    this.getTransaction(item, (err, data) => {
                        try {
                            // handle the call back here to parse and return the json string
                            if (err) return done(err);
                            var obj = JSON.parse(data);
                            obj.findval = "txnid"; // the transaction ID was found
                            done(null, obj);
                        }
                        catch (e) {
                            // TODO report this incorrect data and remove it
                            done(e);
                        }
                    });
                },
                (done) => {
                    //  try getting by address
                    this.findAddr(item, done);
                }
            ],            
            (err, results) => {
                callback(err, results);
            }
        );
    } 

    getTxnsByBlockno(blockno, callback) {
        try {
            var result = [];
            let db = this.db(BCTXNS);
            db.createReadStream()
                .on('data', function(data) {
                    try {
                        let dataval = JSON.parse(data.value);
                        if (dataval.blockno == blockno) {
                            result.push(dataval);
                        }
                    }
                    catch (err) {
                    }
                })
                .on('error', function(err) {
                    callback(err)
                })
                .on('close', function() {
                })
                .on('end', function() {
                    callback(null, result);
                });
        }
        catch (err) {
            callback(err);
        }
    } 

    addTransaction(blockno, blockid, transactions, callback) {
        try {
            let db = this.db(BCTXNS);

            const addtxn = function(transaction, done) {
                var key = TNXPREF + transaction.txnid;
                var txnobj = {
                    blockno: transaction.blockno,
                    blockid: transaction.blockid,
                    txnhex: transaction.txnhex,
                    txnhash: transaction.txnhash,
                    txnid: transaction.txnid
                };
                var data = JSON.stringify(txnobj);
                db.put(key, data, done);
            };

            async.each(
                transactions,
                addtxn,
                (err) => {
                    callback(err);
                }
            );
        }
        catch (err) {
            callback(err);
        }
    }

    updateRedeemedInputs(transactions, callback) {
        try {
            callback();

            //let db = this.db(BCUTXOS);

            // needs to remove the 


            //const addtxn = function(transaction, done) {
            //    var key = TNXPREF + transaction.txnid;
            //    var data = JSON.stringify(transaction);
            //    db.put(key, data, done);
            //};

            //async.each(
            //    transactions,
            //    addtxn,
            //    (err) => {
            //        callback(err);
            //    }
            //);
        }
        catch (err) {
            callback(err);
        }
    }

    getUtxosByTxnId(txnid, callback) {
        let db = this.db(BCUTXOS);
        db.get(txnid, (err, data) => {
            callback(err, data);
            //if (!data.outputs || !data.outputs.length || !data.outputs[vout]) {
            //    return done("invalid vout index in UTXO outputs");
            //}

            //data.outputs.forEach(
            //    (output) => {
            //        existing_total += output.value;
            //    }
            //);
        });
    }

    addUtxos(transactions, callback) {
        try {
            let db = this.db(BCUTXOS);

            const addutxo = function(transaction, done) {
                if (!transaction.txn.utxoset || !transaction.txn.utxoset.length) {
                    return done();
                }

                var key = transaction.txnid;
                var data = JSON.stringify(transaction.txn.utxoset);
                db.put(key, data, done);
            };

            async.each(
                transactions,
                addutxo,
                (err) => {
                    callback(err);
                }
            );
        }
        catch (err) {
            callback(err);
        }
    }

    validateRedeemedInputs(inputs, totalout, callback) {
        if (!inputs || !inputs.length) {
            // this could be a TXN which has no redeamable input like FORG or DATA type input
            return callback();
        }

        let db = this.db(BCUTXOS);

        let existing_total = 0;

        const validate = function(input, done) {
            var txnid = input.prevtx;
            if (!txnid) {
                return done("invalid prevtxn");
            }

            let vout = input.outidx;

            // get the previous TXN from the UTXO set
            db.get(txnid, (err, data) => {
                if (!data.outputs || !data.outputs.length || !data.outputs[vout]) {
                    return done("invalid vout index in UTXO outputs");
                }

                data.outputs.forEach(
                    (output) => {
                        existing_total += output.value;
                    }
              );
            });
        };

        async.each(
            inputs,
            validate, 
            (err, result) => {
                if (err) {
                    if (existing_total < totalout) {
                        return callback("less UTXO outputs exist");
                    }

                    return callback(err);
                }

            }
        );
    }

    validateUtxos(transaction, callback) {
        if (!transaction.utxoset || !transaction.utxoset.length) {
            // no output, nothing to validate
            return callback();
        }
        
        let totalout = transaction.utxoparam.totalout;
        let redeems = transaction.utxoparam.redeems;

        this.validateRedeemedInputs(redeems, totalout, (err) => {
            callback(err);
        });
    }

    addBlock(blockno, blockid, blockhex, transactions, callback) {
        try {            
            async.waterfall(
                [
                    (cb) => {
                        let data = JSON.stringify({
                            blockno: blockno,
                            blockhex: blockhex
                        });      
                        let db = this.db(BCBLOCKS);
                        db.put(blockid, data, cb); 
                    },
                    (cb) => {
                        this.addBlockNo(blockno, blockid, cb);
                    },
                    (cb) => {
                        this.addTransaction(blockno, blockid, transactions, cb);
                    },
                    (cb) => {
                        // add the new UTXOs
                        this.addUtxos(transactions, cb);
                    },
                    (cb) => {
                        // update the existing UTXOs
                        this.updateRedeemedInputs( transactions, cb);
                    }
                ],
                (err) => {
                    callback(err);
                }
            );
        }
        catch (e) {
            callback(e);
        }            
    }

    readBC(bcindexes, callback) {
        try {
            var result = {
                blockidxs: [],
                blocks: []
            }

            const readbcidx = (done) => {
                async.each(
                    bcindexes,
                    (blockno, cb) => {
                        this.getBlockIdx(blockno, (err, data) => {
                            if (err) return cb(err);
                            result.blockidxs.push({
                                blockno: blockno,
                                blockid: data
                            });
                            cb();
                        });
                    },
                    (err) => {
                        done(err);
                    }
                );
            };

            const readblocks = (done) => {
                async.each(
                    result.blockidxs,
                    (bcidx, cb) => {
                        let blockid = bcidx.blockid;
                        this.getBlock(blockid, (err, data) => {
                            if (err) return cb(err);
                            result.blocks.push({
                                blockid: blockid,
                                block: data
                            });
                            cb();
                        });
                    },
                    (err) => {
                        done(err);
                    }
                );
            };

            async.waterfall(
                [
                    (cb) => {
                        readbcidx(cb);
                    },
                    (cb) => {
                        readblocks(cb);
                    }
                ],
                (err) => {
                    callback(err, result);
                }
            );

            //
        }
        catch (e) {
            callback(e);
        }
    }
}

module.exports = BcLevelDB.instance;

