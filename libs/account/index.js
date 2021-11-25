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
Author: Streembit team
Copyright (C) 2017 ZoVolt Ltd
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

import AccountsDb from "../database/accountdb.js";
import { createHash } from 'crypto';
import { config } from '../config/index.js';
import * as peermsg from "../message/index.js";
import secrand from "secure-random";
import { logger } from "streembit-util";
import { EccKey } from "../crypto/index.js";

let instance = null;

export class Account {

    constructor() {
        if (!instance) {
            instance = this;
            this.m_key = null;
            this.m_connsymmkey = null;
            this.m_accountname = null;
        }

        return instance;
    }

    get accountname() {
        return this.m_accountname;
    }

    set accountname(value) {
        this.m_accountname = value;
    }

    get ppkikey() {
        return this.m_key;
    }

    set ppkikey(value) {
        this.m_key = value;
    }

    get cryptokey() {
        return this.m_key ? this.m_key.cryptoKey : '';
    }

    get private_key() {
        return this.m_key ? this.m_key.privateKey : '';
    }

    get private_key_hex() {
        return this.m_key ? this.m_key.privateKeyHex : '';
    }

    get public_key() {
        return this.m_key ? this.m_key.publicKeyHex : '';
    }

    get bs58pk() {
        return this.m_key ? this.m_key.publicKeyBs58 : '';
    }

    get public_key_hash() {
        return this.m_key ? this.m_key.pubkeyhash : '';
    }

    get accountpk() {
        return this.m_key ? this.m_key.pkrmd160hash : '';
    }

    get is_user_initialized() {
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

    addToDB(password, cipher, callback) {
        var database = new AccountsDb();
        database.add(
            this.accountname,
            this.accountpk,
            password,
            cipher,
            (err) => {
                if (err) {
                    return callback("Database update error: " + (err.message || err));
                }

                if (callback) {
                    callback();
                }
            }
        );
    }

    genCipher(smk) {
        // get an entropy for the ECC key
        var rndstr = secrand.randomBuffer(32).toString("hex");
        var entropy = createHash("sha256").update(rndstr).digest("hex");

        // create ECC key
        var key = new EccKey();
        key.generateKey(entropy);

        //  encrypt the account data
        var user_context = {
            "privatekey": key.privateKeyHex,
            "timestamp": Date.now()
        };

        this.ppkikey = key;

        return peermsg.aes256encrypt(smk, JSON.stringify(user_context));
    }

    create_account(account, password, callback) {
        try {
            if (!password)
                throw new Error("create_account invalid password parameter");

            if (!account)
                throw new Error("create_account invalid account parameter");

            const password_hash = createHash('sha256').update(password).digest('hex');
            const symcrypt_key = this.getCryptPassword(password);
            const cipher_context = this.genCipher(symcrypt_key);
            const skrnd = secrand.randomBuffer(32).toString("hex");
            const skhash = createHash("sha256").update(skrnd).digest("hex");
            this.connsymmkey = skhash;

            this.accountname = account;

            this.addToDB(password_hash, cipher_context, (err) => {
                if (err) {
                    callback(err);
                }

                logger.info("New account pkhash: " + this.public_key_hash);
                logger.info("New account bs58pk: " + this.bs58pk);

                config.account = account;
                callback();
            });
        }
        catch (err) {
            logger.error("create_account error %j", err);
            callback(err);
        }
    };

    load_account(password, data, callback) {
        try {
            if (!data) {
                return callback("Invalid parameters, the data and password parameterss are required");
            }

            // decrypt the cipher
            let plain_text;
            try {
                const symcrypt_key = this.getCryptPassword(password);
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
                if (!accountobj || !accountobj.privatekey || !accountobj.timestamp) {
                    return callback("invalid password or invalid user object stored");
                }
            }
            catch (e) {
                return callback("Account initialize error. Select a saved account and enter the valid password. The encrypted account information must exists on the computer.");
            }

            var hexPrivatekey = accountobj.privatekey;
            // load ECC key from the hex private key
            var key = new EccKey();
            key.keyFromPrivate(hexPrivatekey, 'hex');

            if (key.pkrmd160hash != data.accountpk) {
                return callback("Error in initializing the account, most likely an incorrect password");
            }

            this.ppkikey = key;

            var skrnd = secrand.randomBuffer(32).toString("hex");
            var skhash = createHash("sha256").update(skrnd).digest("hex");
            this.connsymmkey = skhash;

            logger.info("loaded pkhash: " + this.public_key_hash);
            logger.info("loaded bs58pk: " + this.bs58pk);

            this.accountname = data.account;

            // the account exists and the encrypted entropy is correct!
            callback();
        }
        catch (err) {
            callback(err)
        }
    };

    restore(account, password, data, callback) {
        try {
            if (!user || !user.account) {
                throw new Error("invalid user data");
            }

            var account = user.account;

            var pbkdf2 = this.getCryptPassword(password);

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
            var key = new EccKey();
            key.keyFromPrivate(hexPrivatekey, 'hex');
            if (key.pkrmd160hash != accountobj.accountpk) {
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

            this.accountname = account;

            this.addToDB(cipher_context, function () {
                callback();
            });
        }
        catch (e) {
            return callback("Account restore error: %j", e);
        }
    };

    change_password(password, callback) {
        try {
            if (!password) {
                return callback("Invalid parameters, the account and passwords are required");
            }


            var symcrypt_key = this.getCryptPassword(password);
            var user_context = {
                "privatekey": this.ppkikey.privateKeyHex,
                "connsymmkey": this.connsymmkey,
                "timestamp": Date.now()
            };

            var cipher_context = peermsg.aes256encrypt(symcrypt_key, JSON.stringify(user_context));
            this.addToDB(this.accountpk, cipher_context, function () {
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

    init(password) {
        //Todo need to change
        return new Promise((resolve, reject) => {
            try {
                if (!this.validatePassword(password)) {
                    return reject("Password syntax validation error: Invalid password, the password must be at least 6 characters long, must include both lower case and upper case characters, a number and special character.");
                }

                const db = new AccountsDb();
                db.data(
                    (err, data) => {
                        if (err) {
                            return reject("Account database error: " + (err.message || err));
                        }

                        if (!data) {
                            this.create_account('streembit-cli', password, resolve);
                        }
                        else {
                            //logger.debug("pwd : %s", password);
                            const password_hash = createHash('sha256').update(password).digest('hex');
                            //logger.debug("param pwd hash: %s", password_hash);
                            //logger.debug("dbase pwd hash: %s", data.password);
                            if (password_hash !== data.password) {
                                return reject("Account initialization error: Invalid password");
                            }

                            config.account = data.account;
                            this.load_account(password, data, resolve);
                        }
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });

    }

    load(password, callback) {
        // get the account details from the database
        try {
            var db = new AccountsDb();
            db.data(
                (err, data) => {
                    if (err) {
                        return callback("Account database error: " + (err.message || err));
                    }

                    if (!data) {
                        return callback("Data for account doesn't exists in the account database");
                    }

                    const password_hash = createHash('sha256').update(password).digest('hex');
                    if (password_hash !== data.password) {
                        return callback("Error: Invalid password");
                    }

                    this.load_account(password, data, callback);
                }
            );
        }
        catch (err) {
            callback(err);
        }
    }

    validatePassword(pwd) {
        if (!(pwd && /^[a-z0-9._\$\^%\*\+!\?#@\-]{6,40}$/i.test(pwd)) ||
            pwd.replace(/[^a-z]/gi, '').length < 2 ||
            pwd.replace(/[^0-9]/g, '').length < 1
        ) {
            return false;
        }

        return true;
    }

    validateAccountName(txt) {
        if (!(txt && /^[a-z0-9_\-]{4,64}$/i.test(txt)) ||
            txt.replace(/[^a-z]/gi, '').length < 2
        ) {
            return false;
        }

        return true;
    }
}
