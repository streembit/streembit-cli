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


import { bcdbschema } from '../../dbschema.json'


const singleton = Symbol();
const singleton_verifier = Symbol()

class Database {
    constructor(verifier) {
        if (verifier != singleton_verifier) {
            throw "Constructing Database singleton is not allowed";
        }

        this.db = 0;
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new Database(singleton_verifier);
        }
        return this[singleton];
    }

    dbfactory() {
        if (this.db != 0) {
            return this.db;
        }

        let type = bcdbschema[0].type;
        switch (type) {
            case "leveldb":
                let BcLevelDB = require("./bcleveldb");
                this.db = new BcLevelDB();
                break;
            default:
                throw new Error(type + " DB factory is not implemented")
        }

        return this.db;
    }

    readBC(bcindexes, callback) {
        let db = this.dbfactory();
        db.readBC(bcindexes, callback);
    }

    getBlock(blockhash, callback) {
        let db = this.dbfactory();
        db.getBlock(blockhash, callback);
    }

    addBlock(blockno, blockid, blockhex, transactions, callback) {
        let db = this.dbfactory();
        db.addBlock(blockno, blockid, blockhex, transactions, callback);
    }

    getBlockno(blockno, callback) {
        let db = this.dbfactory();
        db.getBlockno(blockno, callback);
    }

    findItem(item, callback) {
        let db = this.dbfactory();
        db.findItem(item, callback);
    }

    validateUtxos(transaction, callback) {
        let db = this.dbfactory();
        db.validateUtxos(transaction, callback);
    }

    getBlockIdx(blockno, callback) {
        let db = this.dbfactory();
        db.getBlockIdx(blockno, callback);
    }

    getTxnsByBlockno(blockno, callback) {
        let db = this.dbfactory();
        db.getTxnsByBlockno(blockno, callback);
    }

    getUtxosByTxnId(txnid, callback) {
        let db = this.dbfactory();
        db.getUtxosByTxnId(txnid, callback);
    }

    getLastBlockno(callback) {
        let db = this.dbfactory();
        db.getLastBlockno(callback);
    }

}

export default Database.instance;

