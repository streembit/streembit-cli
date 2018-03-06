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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


const config = require("libs/config");
const logger = require("streembit-util").logger;
const prompt = require("prompt");


class BlockchainHandler {
    constructor(cmd, callback) {
        this.cmd = cmd;
        this.cb = callback;
        this.validCmd = [
            'backupwallet',
            'createrawtransaction',
            'decoderawtransaction',
            'dumpprivkey',
            'dumpwallet',
            'encryptwallet',
            'getaccount',
            'getaccountaddress',
            'getaddressesbyaccount',
            'getbalance',
            'getblock',
            'getblockcount',
            'getblockhash',
            'getinfo',
            'getnewaddress',
            'getrawtransaction',
            'getreceivedbyaccount',
            'getreceivedbyaddress',
            'gettransaction',
            'gettxout',
            'importprivkey',
            'listaccounts',
            'listreceivedbyaccount',
            'listreceivedbyaddress',
            'listsinceblock',
            'listtransactions',
            'listunspent',
            'listlockunspent',
            'lockunspent',
            'sendfrom',
            'sendmany',
            'sendrawtransaction',
            'sendtoaddress',
            'setaccount',
            'settxfee',
            'signmessage',
            'signrawtransaction',
            'submitblock',
            'validateaddress',
            'verifymessage'
        ];
    }

    run() {
        if (!config.blockchain_config.run) {
            return this.cb("Command line interface error: BC module is not active");
        }

        logger.info("Run blockchain handler");

        this.init();
    }

    init() {
        const schema = {
            properties: {
                cmd: {
                    description: 'Enter blockchain command',
                    type: 'string',
                    pattern: /^[a-z0-9 \/\\\#&%@\._\$#&%@\+\-]{6,}$/i,
                    message: 'Invalid command',
                    required: true
                },
            }
        };

        prompt.message = "";

        prompt.start();

        prompt.get(schema, async (err, result) => {
            if (err) {
                if (err.message === 'canceled') { // ^C
                    return this.cmd.run(this.cb);
                }

                throw new Error(err);
            }

            const inp_r = result.cmd.split(/\s+/);
            const cmd = inp_r[0];
            const cix = this.validCmd.indexOf(inp_r[0]) > -1;

            if (cix) {
                let params = inp_r.slice(1);
                if (cmd === 'encryptwallet') {
                    params = [ params.join(' ') ];
                } else if (cmd === 'signmessage') {
                    params = [ params[0] || null, params[1] ? params.slice(1).join(' ') : null ];
                } else if (cmd === 'verifymessage') {
                    params = [ params[0] || null, params[1] || null, params[2] ? params.slice(2).join(' ') : null ];
                }

                try {
                    await this[`do${cmd.charAt(0).toUpperCase()}${cmd.slice(1)}`](...params);
                } catch (err) {
                    logger.error(err);
                    console.error('\x1b[31m%s\x1b[0m', '{error}:', err);
                }
            }

            this.helper(!cix);
            this.run();
        });
    }

    doBackupwallet(destination) {
        return new Promise((resolve, reject) => {
            if (!this.validateDestination(destination)) {
                return reject('Destination folder invalid');
            }

            console.log('backupwallet');
            resolve();
        });
    }

    doCreaterawtransaction(txs, bills) {
        return new Promise((resolve, reject) => {
            try {
                txs = Buffer.from(txs, 'hex');
                bills = Buffer.from(bills, 'hex');
                txs = JSON.parse(txs);
                bills = JSON.parse(bills);
            } catch (err) {
                return reject(err.message);
            }

            if (!txs.length || !bills.length) {
                return reject('Omitted params found');
            }

            if (txs.some(tx => {
                if (!this.validateHex(tx.txid) || isNaN(tx.vout)) {
                    return true;
                }
            })) {
                return reject('Invalid TX found in transactions object');
            }
            if (Object.keys(bills).some(address => {
                if (!this.validateHex(address)) {
                    return true;
                }
            })) {
                return reject('Invalid address found in addresses object');
            }
            if (Object.values(bills).some(amount => {
                if (isNaN(amount)) {
                    return true;
                }
            })) {
                return reject('Invalid amount found in addresses object');
            }

            console.log('createrawtransaction');
            resolve();
        });
    }

    doDecoderawtransaction(hex) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hex)) {
                reject('Invalid hex string');
            }

            console.log('decoderawtransaction');
            resolve();
        });
    }

    doDumpprivkey(address) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(address)) {
                reject('Invalid Address provided');
            }

            console.log('dumpprivkey');
            resolve();
        });
    }

    doDumpwallet(destination) {
        return new Promise((resolve, reject) => {
            if (!this.validateDestination(destination)) {
                return reject('Filename invalid');
            }

            console.log('dumpwallet');
            resolve();
        });
    }

    doEncryptwallet(passphrase) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(passphrase)) {
                return reject('Invalid passphrase');
            }

            console.log('encryptwallet');
            resolve();
        });
    }

    doGetaccount(address) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(address)) {
                return reject('Invalid address');
            }

            console.log('getaccount');
            resolve();
        });
    }

    doGetaccountaddress(account) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }

            console.log('getaccountaddress');
            resolve();
        });
    }

    doGetaddressesbyaccount(account) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }

            console.log('getaddressesbyaccount');
            resolve();
        });
    }

    doGetbalance(account, minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                console.log('getbalance total available');
            } else {
                console.log('getbalance for account');
            }
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }

            console.log('getbalance');
            resolve();
        });
    }

    doGetblock(hash) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hash)) {
                return reject('Invalid hash');
            }

            console.log('getblock');
            resolve();
        });
    }

    doGetblockcount() {
        return new Promise((resolve, reject) => {

            console.log('getblockcount');
            resolve();
        });
    }

    doGetblockhash(index) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(index)) {
                return reject('Invalid index');
            }

            console.log('getblockhash');
            resolve();
        });
    }

    doGetinfo() {
        return new Promise((resolve, reject) => {

            console.log('getinfo');
            resolve();
        });
    }

    doGetnewaddress(account) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                console.log('getnewaddress');
            } else {
                console.log('getnewaddress credited to ' +account);
            }

            resolve();
        });
    }

    doGetrawtransaction(txid, verbose = 0) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(txid)) {
                return reject('Invalid Transaction ID');
            }
            if (!Number.isInteger(verbose)) {
                verbose = 0;
            }

            console.log('getrawtransaction');
            resolve();
        });
    }

    doGetreceivedbyaccount(account, minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }

            console.log('getreceivedbyaccount');
            resolve();
        });
    }

    doGetreceivedbyaddress(address, minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(address)) {
                return reject('Invalid address');
            }
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }

            console.log('getreceivedbyaddress');
            resolve();
        });
    }

    doGettransaction(txid) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(txid)) {
                return reject('Invalid transaction ID');
            }

            console.log('gettransaction');
            resolve();
        });
    }

    doGettxout(txid, n, includemempool = true) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(txid)) {
                return reject('Invalid transaction ID');
            } else if (isNaN(n)) {
                return reject('Invalid n');
            }
            if (!isBoolean(includemempool)) {
                includemempool = true;
            }

            console.log('gettxout');
            resolve();
        });
    }

    doImportprivkey(pvk, label, rescan = true) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(pvk)) {
                return reject('Invalid private key');
            }
            if (!this.validatePlainText(label)) {
                label = null;
            }
            if (!isBoolean(rescan)) {
                rescan = true;
            }

            console.log('importprivkey');
            resolve();
        });
    }

    doListaccounts(minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }

            console.log('listaccounts');
            resolve();
        });
    }

    doListreceivedbyaccount(minconf = 1, includeempty = false) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }
            if (!isBoolean(includeempty)) {
                includeempty = true;
            }

            console.log('listreceivedbyaccount');
            resolve();
        });
    }

    doListreceivedbyaddress(minconf = 1, includeempty = false) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }
            if (!isBoolean(includeempty)) {
                includeempty = true;
            }

            console.log('listreceivedbyaddress');
            resolve();
        });
    }

    doListsinceblock(blockhash, target_confirmations) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(blockhash)) {
                return reject('Invalid hash');
            }
            // target_confirmations ??

            console.log('gettransaction');
            resolve();
        });
    }

    doListtransactions(account, count = 0, from = 0) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }
            if (isNaN(count)) {
                count = 0;
            }
            if (isNaN(from)) {
                from = 0;
            }

            console.log('listtransactions');
            resolve();
        });
    }

    doListunspent(minconf = 1, maxconf = 999999) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }
            if (!Number.isInteger(maxconf)) {
                maxconf = 999999;
            }
    
            console.log('listunspent');
            resolve();
        });
    }

    doListlockunspent() {
        return new Promise((resolve, reject) => {

            console.log('listlockunspent');
            resolve();
        });
    }

    doLockunspent(unlock) {
        return new Promise((resolve, reject) => {
            try {
                unlock = Buffer.from(unlock, 'hex');
                unlock = JSON.parse(unlock);
            } catch (e) {
                return reject(e.message);
            }
            if (!Array.isArray(unlock) || !unlock.length) {
                return reject('Invalid unlock hex supplied');
            }

            console.log('lockunspent');
            resolve();
        });
    }

    doSendfrom(fromaccount, tobitcoinaddress, amount, minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(fromaccount)) {
                return reject('Invalid account');
            }
            if (!this.validateHex(tobitcoinaddress)) {
                return reject('Invalid address');
            }
            if (isNaN(amount)) {
                return reject('Invalid amount');
            }
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }

            console.log('sendfrom');
            resolve();
        });
    }

    doSendmany(fromaccount, addresses, minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(fromaccount)) {
                return reject('Invalid account');
            }
            try {
                addresses = Buffer.from(addresses, 'hex');
                addresses = JSON.parse(addresses);
            } catch (e) {
                return reject(e.message);
            }
            if (Object.keys(addresses).some(address => {
                if (!this.validateHex(address)) {
                    return true;
                }
            })) {
                return reject('Invalid address value in addresses object');
            }
            if (Object.values(addresses).some(amount => {
                if (isNaN(amount)) {
                    return true;
                }
            })) {
                return reject('Invalid amount value in addresses object');
            }
            if (isNaN(minconf)) {
                minconf = 1;
            }

            console.log('sendmany');
            resolve();
        });
    }

    doSendrawtransaction(hex) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hex)) {
                return reject('Invalid hex string');
            }

            console.log('sendrawtransaction');
            resolve();
        });
    }

    doSendtoaddress(bitcoinaddress, amount) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(bitcoinaddress)) {
                return reject('Invalid address');
            }
            if (isNaN(amount)) {
                return reject('Invalid amount');
            }

            console.log('sendrawtransaction');
            resolve();
        });
    }

    doSetaccount(bitcoinaddress, account) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(bitcoinaddress)) {
                return reject('Invalid address');
            }
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }

            console.log('setaccount');
            resolve();
        });
    }

    doSettxfee(amount) {
        return new Promise((resolve, reject) => {
            if (isNaN(amount)) {
                return reject('Invalid amount');
            }

            console.log('settxfee');
            resolve();
        });
    }

    doSignmessage(bitcoinaddress, message) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(bitcoinaddress)) {
                return reject('Invalid address');
            }
            if (!this.validatePlainText(message)) {
                return reject('Invalid message');
            }

            console.log('signmessage');
            resolve();
        });
    }

    doSignrawtransaction(hex, txs, pkeys) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hex)) {
                return reject('Invalid hex string');
            }
            try {
                txs = Buffer.from(txs, 'hex');
                pkeys = Buffer.from(pkeys, 'hex');
                txs = JSON.parse(txs);
                pkeys = JSON.parse(pkeys);
            } catch (e) {
                return reject(e.message);
            }

            if (!txs.length || !pkeys.length) {
                return reject('Omitted params found');
            }

            if (txs.some(tx => {
                if (!this.validateHex(tx.txid) || !Number.isInteger(tx.vout) || !this.validatehex(tx.scriptPubKey)) {
                    return true;
                }
            })) {
                return reject('Invalid TX found in transactions object');
            }
            if (pkeys.some(pk => {
                if (!this.validateHex(pk)) {
                    return true;
                }
            })) {
                return reject('Invalid private key found in private keys object');
            }

            console.log('signrawtransaction');
            resolve();
        });
    }

    doSubmitblock(hex, params = '') {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hex)) {
                return reject('Invalid hex string');
            }
            if (params.length) {
                try {
                    params = Buffer.from(params, 'hex');
                    params = JSON.parse(params);
                } catch (e) {
                    return reject(e.message);
                }
            }

            console.log('submitblock');
            resolve();
        });
    }

    doValidateaddress(bitcoinaddress) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(bitcoinaddress)) {
                return reject('Invalid address');
            }

            console.log('validateaddress');
            resolve();
        });
    }

    doVerifymessage(bitcoinaddress, signature, message) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(bitcoinaddress)) {
                return reject('Invalid address');
            }
            if (!this.validateHex(signature)) {
                return reject('Invalid signature');
            }
            if (!this.validatePlainText(message)) {
                return reject('Invalid message');
            }
            
            console.log('verifymessage');
            resolve();
        });
    }

    validateDestination(destination) {
        return destination && /^[a-z0-9\/\\\\._\$#&%@\-]{4,}$/i.test(destination);
    }

    validatePlainText(passphrase) {
        return passphrase && /^[a-z0-9 ]{2,}$/i.test(passphrase);
    }

    validateHex(hex) {
        hex = Buffer.from(hex, 'hex');

        return !!hex.length;
    }

    helper(show) {
        if (show) {
            console.group('\x1b[32m', "\nBlockchain Commands:");
            console.log('\x1b[30m', '-------------------');
            console.log('\x1b[34m', 'backupwallet', '<destination>');
            console.log(' createrawtransaction', '[{"txid":txid,"vout":n},...] {address:amount,...}');
            console.log(' decoderawtransaction', '<hex string>');
            console.log(' dumpprivkey', '<bitcoinaddress>');
            console.log(' dumpwallet', '<filename>');
            console.log(' encryptwallet', '<passphrase>');
            console.log(' getaccount', '<bitcoinaddress>');
            console.log(' getaccountaddress', '<account>');
            console.log(' getaddressesbyaccount', '<account>');
            console.log(' getbalance', '[account] [minconf=1]');
            console.log(' getblock', '<hash>');
            console.log(' getblockcount');
            console.log(' getblockhash', '<index>');
            console.log(' getinfo');
            console.log(' getnewaddress', '[account]');
            console.log(' getrawtransaction', '<txid> [verbose=0]');
            console.log(' getreceivedbyaccount', '[account] [minconf=1]');
            console.log(' getreceivedbyaddress', '<bitcoinaddress> [minconf=1]');
            console.log(' gettransaction', '<txid>');
            console.log(' gettxout', '<txid> <n> [includemempool=true]');
            console.log(' importprivkey', '<bitcoinprivkey> [label] [rescan=true]');
            console.log(' listaccounts', '[minconf=1]');
            console.log(' listreceivedbyaccount', '[minconf=1] [includeempty=false]');
            console.log(' listreceivedbyaddress', '[minconf=1] [includeempty=false]');
            console.log(' listsinceblock', '[blockhash] [target-confirmations]');
            console.log(' listtransactions', '[account] [count=10] [from=0]');
            console.log(' listunspent', '[minconf=1] [maxconf=999999]');
            console.log(' listlockunspent', '');
            console.log(' lockunspent', '<unlock?> [array-of-objects]');
            console.log(' sendfrom', '<fromaccount> <tobitcoinaddress> <amount> [minconf=1] [comment] [comment-to]');
            console.log(' sendmany', '<fromaccount> {address:amount,...} [minconf=1] [comment]');
            console.log(' sendrawtransaction', '<hexstring>');
            console.log(' sendtoaddress', '<bitcoinaddress> <amount> [comment] [comment-to]');
            console.log(' setaccount', '<bitcoinaddress> <account>');
            console.log(' settxfee', '<amount>');
            console.log(' signmessage', '<bitcoinaddress> <message>');
            console.log(' signrawtransaction', '<hexstring> [{"txid":txid,"vout":n,"scriptPubKey":hex},...] [<privatekey1>,...]');
            console.log(' submitblock', '<hex data> [optional-params-obj]');
            console.log(' validateaddress', '<bitcoinaddress>');
            console.log(' verifymessage', '<bitcoinaddress> <signature> <message>');
            console.log('\x1b[30m', '-------------------');
            console.groupEnd();
        }
    }
}

module.exports = BlockchainHandler;
