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


const logger = require("streembit-util").logger;
const prompt = require("prompt");

const isBoolean = val => 'boolean' === typeof val;


class BlockchainCmds {
    constructor(cmd, callback, bc_config) {
        this.cmd = cmd;
        this.cb = callback;
        this.active = bc_config.run;

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
        if (!this.active) {
            console.log("Command line interface error: BC module is not active");
            return this.cb("Command line interface error: BC module is not active");
        }

        logger.info("Run blockchain commands handler");

        this.command();
    }

    command() {
        const schema = {
            properties: {
                cmd: {
                    description: 'Enter blockchain command',
                    type: 'string',
                    pattern: /^[a-z0-9 \/\\\#&%@\.,:_\$#&%@\+\-]{6,}$/i,
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

            await this.processInput(result.cmd);
            this.command();
        });
    }

    async processInput(inp) {
        const inp_r = inp.split(/\s+/);
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
                const result = await this[`do${cmd.charAt(0).toUpperCase()}${cmd.slice(1)}`](...params);
                console.log(result);
            } catch (err) {
                logger.error(err);
                console.error('\x1b[31m%s\x1b[0m', '{error}:', err);
            }
        }

        this.helper(!cix);
    }

    doBackupwallet(destination) {
        return new Promise((resolve, reject) => {
            if (!this.validateDestination(destination)) {
                return reject('Destination folder invalid');
            }

            resolve('backupwallet');
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
            if (!txs.length || !Object.keys(bills).length) {
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

            resolve('createrawtransaction');
        });
    }

    doDecoderawtransaction(hex) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hex)) {
                reject('Invalid hex string');
            }

            resolve('decoderawtransaction');
        });
    }

    doDumpprivkey(address) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(address)) {
                reject('Invalid Address provided');
            }

            resolve('dumpprivkey');
        });
    }

    doDumpwallet(destination) {
        return new Promise((resolve, reject) => {
            if (!this.validateDestination(destination)) {
                return reject('Filename invalid');
            }

            resolve('dumpwallet');
        });
    }

    doEncryptwallet(passphrase) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(passphrase)) {
                return reject('Invalid passphrase');
            }

            resolve('encryptwallet');
        });
    }

    doGetaccount(address) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(address)) {
                return reject('Invalid address');
            }

            resolve('getaccount');
        });
    }

    doGetaccountaddress(account) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }

            resolve('getaccountaddress');
        });
    }

    doGetaddressesbyaccount(account) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                return reject('Invalid account');
            }

            resolve('getaddressesbyaccount');
        });
    }

    doGetbalance(account, minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }
            if (!this.validatePlainText(account)) {
                resolve('getbalance total available');
            } else {
                resolve('getbalance for account');
            }
        });
    }

    doGetblock(hash) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hash)) {
                return reject('Invalid hash');
            }

            resolve('getblock');
        });
    }

    doGetblockcount() {
        return new Promise((resolve, reject) => {

            resolve('getblockcount');
        });
    }

    doGetblockhash(index) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(index)) {
                return reject('Invalid index');
            }

            resolve('getblockhash');
        });
    }

    doGetinfo() {
        return new Promise((resolve, reject) => {

            resolve('getinfo');
        });
    }

    doGetnewaddress(account) {
        return new Promise((resolve, reject) => {
            if (!this.validatePlainText(account)) {
                resolve('getnewaddress');
            } else {
                resolve('getnewaddress credited to ' +account);
            }
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

            resolve('getrawtransaction');
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

            resolve('getreceivedbyaccount');
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

            resolve('getreceivedbyaddress');
        });
    }

    doGettransaction(txid) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(txid)) {
                return reject('Invalid transaction ID');
            }

            resolve('gettransaction');
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

            resolve('gettxout');
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

            resolve('importprivkey');
        });
    }

    doListaccounts(minconf = 1) {
        return new Promise((resolve, reject) => {
            if (!Number.isInteger(minconf)) {
                minconf = 1;
            }

            resolve('listaccounts');
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

            resolve('listreceivedbyaccount');
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

            resolve('listreceivedbyaddress');
        });
    }

    doListsinceblock(blockhash, target_confirmations) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(blockhash)) {
                return reject('Invalid hash');
            }
            // target_confirmations ??

            resolve('listsinceblock');
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

            resolve('listtransactions');
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

            resolve('listunspent');
        });
    }

    doListlockunspent() {
        return new Promise((resolve, reject) => {

            resolve('listlockunspent');
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

            resolve('lockunspent');
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

            resolve('sendfrom');
        });
    }

    doSendmany(fromaccount, addresses, amount, minconf = 1) {
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
            if (!addresses.length) {
                return reject('Invalid addresses');
            }
            if (addresses.some(address => {
                if (!this.validateHex(address)) {
                    return true;
                }
            })) {
                return reject('Invalid address value in addresses object');
            }
            if (isNaN(minconf)) {
                minconf = 1;
            }

            resolve('sendmany');
        });
    }

    doSendrawtransaction(hex) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(hex)) {
                return reject('Invalid hex string');
            }

            resolve('sendrawtransaction');
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

            resolve('sendtoaddress');
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

            resolve('setaccount');
        });
    }

    doSettxfee(amount) {
        return new Promise((resolve, reject) => {
            if (isNaN(amount)) {
                return reject('Invalid amount');
            }

            resolve('settxfee');
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

            resolve('signmessage');
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
                if (!this.validateHex(tx.txid) || !Number.isInteger(tx.vout) || !this.validateHex(tx.scriptPubKey)) {
                    console.log(tx)
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

            resolve('signrawtransaction');
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

            resolve('submitblock');
        });
    }

    doValidateaddress(bitcoinaddress) {
        return new Promise((resolve, reject) => {
            if (!this.validateHex(bitcoinaddress)) {
                return reject('Invalid address');
            }

            resolve('validateaddress');
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

            resolve('verifymessage');
        });
    }

    validateDestination(destination) {
        return destination && /^[a-z0-9\/ :\\\\._\$#@\-]{4,}$/i.test(destination);
    }

    validatePlainText(passphrase) {
        return passphrase && /^[a-z0-9 ]{2,}$/i.test(passphrase);
    }

    validateHex(hex) {
        let hex_b;

        try {
            hex_b = Buffer.from(hex, 'hex');
        } catch (e) {
            return false;
        }

        return hex === hex_b.toString('hex');
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

module.exports = BlockchainCmds;
