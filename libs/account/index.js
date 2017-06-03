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
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const crypto = require('crypto');
const ecckey = require('libs/crypto');
const createHash = require('create-hash');
const secrand = require('secure-random');
const config = require("libs/config");
const Database = require("libs/database/accountdb");
const peermsg = require("libs/message");
const logger = require("libs/logger");

let instance = null;

class Account {

    constructor() {
        if (!instance) {
            instance = this;
            this.m_key = null;
            this.m_connsymmkey = null;
        }

        return instance;
    }

    get ppkikey() {
        return this.m_key;
    }

    set ppkikey (value) {
        this.m_key = value;
    }

    get cryptokey() {
        return this.m_key ? this.m_key.cryptoKey : '';
    }

    get private_key () {
        return this.m_key ? this.m_key.privateKey : '';
    }

    get public_key () {
        return this.m_key ? this.m_key.publicKeyHex : '';
    }

    get bs58pk() {
        return this.m_key ? this.m_key.publicKeyBs58 : '';
    }

    get public_key_hash() {
        return this.m_key ? this.m_key.pubkeyhash : '';
    }

    get accountid() {
        return this.m_key ? this.m_key.pkrmd160hash : '';
    }

    get is_user_initialized () {
        return this.m_key ? true : false;
    }

    get connsymmkey() {
        return this.m_connsymmkey;
    }

    set connsymmkey(value) {
        this.m_connsymmkey = value;
    }


    getCryptPassword(password) {
        var salt = createHash('sha256').update(password).digest('hex');
        var pwdhex = createHash('sha256').update(salt).digest('hex');
        return pwdhex;
    }

    addToDB(accountid, cipher_context, callback) {
        var data = {
            "accountid": accountid,
            "cipher": cipher_context
        };

        var strdata = JSON.stringify(data);

        var appdb = new Database()

        appdb.put(strdata, function (err) {
            if (err) {
                return callback("Database update error: " + ( err.message || err));
            }

            logger.debug("Account was added to database");

            if (callback) {
                callback();
            }
        });
    }

   create_account (password, callback) {
        try {
            if (!password)
                throw new Error("create_account invalid password parameter");

            var symcrypt_key = this.getCryptPassword(password);

            // get an entropy for the ECC key
            var rndstr = secrand.randomBuffer(32).toString("hex");
            var entropy = createHash("sha256").update(rndstr).digest("hex");

            // create ECC key
            var key = new ecckey();
            key.generateKey(entropy);

            //  encrypt the account data
            var user_context = {
                "privatekey": key.privateKeyHex,
                "timestamp": Date.now()
            };
            var cipher_context = peermsg.aes256encrypt(symcrypt_key, JSON.stringify(user_context));

            this.ppkikey = key;

            var skrnd = secrand.randomBuffer(32).toString("hex");
            var skhash = createHash("sha256").update(skrnd).digest("hex");
            this.connsymmkey = skhash;           

            this.addToDB(this.accountid, cipher_context, (err) => {
                logger.info("created bs58pk: " + this.bs58pk);
                callback(err);
            });
        }
        catch (err) {
            logger.error("create_account error %j", err);
            callback(err);
        }
    };

    load_account(data, password, callback) {
        try {
            if (!data || !password) {
                return callback("Invalid parameters, the data and password parameterss are required");
            }

            var symcrypt_key = this.getCryptPassword(password);

            // decrypt the cipher
            var plain_text;
            try {
                plain_text = peermsg.aes256decrypt(symcrypt_key, data.cipher);
            }
            catch (err) {
                if (err.message && err.message.indexOf("decrypt") > -1) {
                    return callback("Account initialize error, most likely an incorrect password was entered");
                }
                else {
                    return callback("Account initialize error: " + err.message);
                }
            }

            var accountobj;
            try {
                accountobj = JSON.parse(plain_text);
                if (!accountobj || !accountobj.privatekey || !accountobj.timestamp ) {
                    return callback("invalid password or invalid user object stored");
                }
            }
            catch (e) {
                return callback("Account initialize error. Select a saved account and enter the valid password. The encrypted account information must exists on the computer.");
            }

            var hexPrivatekey = accountobj.privatekey;
            // load ECC key from the hex private key
            var key = new ecckey();
            key.keyFromPrivate(hexPrivatekey, 'hex');

            if (key.pkrmd160hash != data.accountid) {
                return callback("Error in initializing the account, most likely an incorrect password");
            }

            this.ppkikey = key;

            var skrnd = secrand.randomBuffer(32).toString("hex");
            var skhash = createHash("sha256").update(skrnd).digest("hex");
            this.connsymmkey = skhash;

            logger.info("loaded bs58pk: " + this.bs58pk);

            // the account exists and the encrypted entropy is correct!
            callback();
        }
        catch (err) {
            callback(err)
        }
    };

    restore (password, data, callback) {
        try {
            if (!user || !user.account) {
                throw new Error("invalid user data");
            }

            var account = user.account;

            var pbkdf2 = this.getCryptPassword(password, account);

            // decrypt the cipher
            var plain_text;
            try {
                plain_text = peermsg.aes256decrypt(pbkdf2, data.cipher);
            }
            catch (err) {
                if (err.message && err.message.indexOf("decrypt") > -1) {
                    return callback("Account initialize error, most likely an incorrect password was entered");
                }
                else {
                    return callback("Account initialize error: " + err.message);
                }
            }

            var accountobj;
            try {
                accountobj = JSON.parse(plain_text);
                if (!accountobj || !accountobj.privatekey || !accountobj.timestamp) {
                    return callback("invalid password");
                }
            }
            catch (e) {
               return callback("Account initialize error. Select a saved account and enter the valid password.");
            }

            var hexPrivatekey = accountobj.privatekey;

            // create ECC key
            var key = new ecckey();
            key.keyFromPrivate(hexPrivatekey, 'hex');
            if (key.pkrmd160hash != accountobj.accountid) {
                return callback("Error in restoring the account, incorrect password or invalid backup data");
            }

            if (!accountobj.connsymmkey) {
                return callback("Error in restoring the account, incorrect connection key in backup data");
            }

            //  encrypt this
            var user_context = {
                "privatekey": key.privateKeyHex,
                "connsymmkey": accountobj.connsymmkey,
                "timestamp": Date.now()
            };

            var cipher_context = peermsg.aes256encrypt(pbkdf2, JSON.stringify(user_context));

            this.ppkikey = key;
            this.connsymmkey = accountobj.connsymmkey;

            this.addToDB(this.accountid, cipher_context, function () {               
                callback();
            });
        }
        catch (e) {
           return callback("Account restore error: %j", e);
        }
    };

    change_password (password, callback) {
        try {
            if (!password) {
               return callback("Invalid parameters, the account and passwords are required");
            }


            var symcrypt_key = this.getCryptPassword(password, account);
            var user_context = {
                "privatekey": this.ppkikey.privateKeyHex,
                "connsymmkey": this.connsymmkey,
                "timestamp": Date.now()
            };

            var cipher_context = peermsg.aes256encrypt(symcrypt_key, JSON.stringify(user_context));
            this.addToDB(this.accountid, cipher_context, function () {
                callback();
            });
        }
        catch (err) {
            callback(err);
        }
    };

    clear() {
        this.ppkikey = null;
    }

    init(callback) {
        // get the account details from the database
        var db = new Database();
        db.data((err, data) => {
            if (err) {
                return callback("Account database error: " + (err.message || err));
            }

            var password = config.password;
            if (!data) {
                // the account does not exists -> set it up
                this.create_account(password, callback);
            }
            else {
                this.load_account(data, password, callback);
            }
        });
    }

    load(password, callback) {
        // get the account details from the database
        var db = new Database();
        db.data((err, data) => {
            if (err) {
                return callback("Account database error: " + (err.message || err));
            }

            if (!data) {
                return callback("Data doesn't exists in the account database");
            }
     
            this.load_account(data, password, callback);            
        });
    }
}


module.exports = Account;