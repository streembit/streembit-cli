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


const merkle = require("./merkle");
const config = require("libs/config");
const logger = require("streembit-util").logger;
const prompt = require("prompt");
const CmdHandler = require("../cmd");


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
            return this.cb("Command line interface error: BC commands is not active");
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
                    pattern: /^[a-z 0-9]{2,60}$/i,
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

            const cix = this.validCmd.indexOf(result.cmd) > -1;

            if (cix) {
                await this[`do${result.cmd.charAt(0).toUpperCase()}${result.cmd.slice(1)}`]();
            }

            this.helper(!cix);
            this.run();
        });
    }

    doBackupwallet() {
        return new Promise((res, rej) => {
            setTimeout(() => {
                console.log('backupwallet');
                res();
            }, 2000);
        });
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
            console.groupEnd('');
        }
    }
}

module.exports = BlockchainHandler;