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
Author: Team Streembit
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
*/


const res = require('../resolvedir');
const assert = require('chai').assert;
const capcon = require('capture-console');
const BlockchainCmds = require('apps/blockchain/cmds');


describe("CMD Handlers", function () {
    let stdout, out, bc;

    before(function() {
        bc = new BlockchainCmds();
    });

    describe("Blockchain Commands, validation", function () {
        const plainTxt = "Eeny meeny miny moe Catch a tiger by the toe";

        it("should validate HEX values", function () {
            const validHex = "a9f98243d3c1bdff8ea4bbc14874e971ac6fc63ce7542efaa2baae0981029846";

            assert.isTrue(bc.validateHex(validHex));
            assert.isFalse(bc.validateHex(plainTxt));
        });

        it("should validate plain text", function () {
            assert.isTrue(bc.validatePlainText(plainTxt));
            assert.isFalse(bc.validatePlainText(plainTxt+ " `exe` me<.*>"));
        });

        it("should validate path names", function () {
            const path = 'C:\\Users\\Domingo\\Docs\\_save_.dat';
            const path2 = '/Users/domingo/docs/save\ _me\ -files/';
            const path3 = 'mal<script>/?vilian%/`$boyz`/';

            assert.isTrue(bc.validateDestination(path));
            assert.isTrue(bc.validateDestination(path2));
            assert.isFalse(bc.validateDestination(path3));
        });
    });
    
    describe("Blockchain Commands", function () {
        const plainTxt = "Eeny meeny miny moe Catch a tiger by the toe";
        const validHex = "a9f98243d3c1bdff8ea4bbc14874e971ac6fc63ce7542efaa2baae0981029846";
        const destination = "/Users/domingo/docs/save\ _me\ -files/";
        const invDestination = "mal<script>/?vilian%/`$boyz`/";
        const txid_vout_obj = "5B7B2274786964223A223533373437323635363536643632363937343230363236633666363336623633363836313639366532303637363536653635373336393733323036323663366636333662222C22766F7574223A307D2C7B2274786964223A2261353639373163326665646138313931626166646633383932313936623138366532653833313131346138326562363136663963646335333265316566623965222C22766F7574223A317D5D";
        const txid_vout_scrpubkey_obj = "5B7B2274786964223A223533373437323635363536643632363937343230363236633666363336623633363836313639366532303637363536653635373336393733323036323663366636333662222C22766F7574223A312C227363726970745075624B6579223A2239656662316532653533646339633666363165623832346131313331653865323836623139363231383966336664626139313831646166656332373136396135227D2C7B2274786964223A2261353639373163326665646138313931626166646633383932313936623138366532653833313131346138326562363136663963646335333265316566623965222C22766F7574223A322C227363726970745075624B6579223A223533373437323635363536643632363937343230363236633666363336623633363836313639366532303637363536653635373336393733323036323663366636333662227D5D";
        const addr_amt_r = "7B2261396639383234336433633162646666386561346262633134383734653937316163366663363363653735343265666161326261616530393831303239383436223A312E3233342C2237363830616465633865616263616261633637366265396538333835346164653062643232636462223A327D";
        const addr_r = "5B2261396639383234336433633162646666386561346262633134383734653937316163366663363363653735343265666161326261616530393831303239383436222C2237363830616465633865616263616261633637366265396538333835346164653062643232636462225D";
        const invHex = "16A68542Z14YQ2F5TU";
        const invBills = { '16A68542Z14YQ2F5TU': 22.34 };
        
        it('should show help for help command', function () {
            const help = bc.processCommand('help', []);
            assert.include(help, 'Blockchain commands:');
        });
        
        it("addmultisigaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doAddmultisigaddress(2, `["${validHex}"]`, 'acc_mocha').then(res => {
                    assert.equal(res, 'addmultisigaddress');
                }).catch(err => {
                    done(new Error(err));
                });
                
                bc.doAddmultisigaddress('z', '[]').then(res => {
                    done(new Error('Expected non-integer to reject in doAddmultisigaddress'))
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
                
                bc.doAddmultisigaddress(2, `["${invHex}"]`).then(res => {
                    done(new Error('Expected non-hex key to reject in doAddmultisigaddress'))
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("backupwallet command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doBackupwallet(destination).then(res => {
                    assert.equal(res, 'backupwallet');
                }).catch(err => {
                    done(new Error(err));
                });
                
                bc.doBackupwallet(invDestination).then(res => {
                    done(new Error('Expected valid path to save wallet'))
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("createrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doCreaterawtransaction(txid_vout_obj, addr_amt_r).then(res => {
                    assert.equal(res, 'createrawtransaction');
                }).catch(err => {
                    done(new Error(err));
                });
                
                bc.doCreaterawtransaction(invHex, addr_amt_r).then(res => {
                    done(new Error('Expected valid hex of txn IDs'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
                
                bc.doCreaterawtransaction(invHex, invBills).then(res => {
                    done(new Error('Expected valid hex in keys of bills'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("decoderawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doDecoderawtransaction(validHex).then(res => {
                    assert.equal(res, 'decoderawtransaction');
                }).catch(err => {
                    done(new Error(err));
                });
    
                bc.doDecoderawtransaction(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("dumpprivkey command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doDumpprivkey(validHex).then(res => {
                    assert.equal(res, 'dumpprivkey');
                }).catch(err => {
                    done(new Error(err));
                });
    
                bc.doDumpprivkey(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("dumpwallet command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doDumpwallet(destination).then(res => {
                    assert.equal(res, 'dumpwallet');
                }).catch(err => {
                    done(new Error(err));
                });
    
                bc.doDumpprivkey(invDestination).then(res => {
                    done(new Error('Expected valid destination'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("encryptwallet command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doEncryptwallet(plainTxt).then(res => {
                    assert.equal(res, 'encryptwallet');
                }).catch(err => {
                    done(new Error(err));
                });
    
                bc.doEncryptwallet(destination).then(res => {
                    done(new Error('Expected plain text'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetaccount(validHex).then(res => {
                    assert.equal(res, 'getaccount');
                }).catch(err => {
                    done(new Error(err));
                });
    
                bc.doGetaccount(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getaccountaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetaccountaddress(plainTxt).then(res => {
                    assert.equal(res, 'getaccountaddress');
                }).catch(err => {
                    done(new Error(err));
                });
    
                bc.doGetaccountaddress(destination).then(res => {
                    done(new Error('Expected plain text'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getaddressesbyaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetaddressesbyaccount(plainTxt).then(res => {
                    assert.equal(res, 'getaddressesbyaccount');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetaddressesbyaccount(destination).then(res => {
                    done(new Error('Expected plain text'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getbalance command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetbalance(plainTxt).then(res => {
                    assert.equal(res, 'getbalance for account');
                }).catch(err => {
                    assert.isNotOk(err, 'Promise error');
                });
                
                bc.doGetbalance().then(res => {
                    assert.equal(res, 'getbalance total available');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetaddressesbyaccount(destination).then(res => {
                    done(new Error('Expected plain text'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getblock command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetblock(validHex).then(res => {
                    assert.equal(res, 'getblock');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetblock(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getblockcount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetblockcount().then(res => {
                    assert.equal(res, 'getblockcount');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("getblockhash command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetblockhash(123).then(res => {
                    assert.equal(res, 'getblockhash');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetblockhash(plainTxt).then(res => {
                    done(new Error('Expected an integer as an index'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getinfo command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetinfo().then(res => {
                    assert.equal(res, 'getinfo');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("getnewaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetnewaddress().then(res => {
                    assert.equal(res, 'getnewaddress');
                }).catch(err => {
                    done(err);
                });
                bc.doGetnewaddress(plainTxt).then(res => {
                    assert.equal(res, 'getnewaddress credited to ' +plainTxt);
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("getrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetrawtransaction(validHex).then(res => {
                    assert.equal(res, 'getrawtransaction');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetrawtransaction(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetreceivedbyaccount(plainTxt).then(res => {
                    assert.equal(res, 'getreceivedbyaccount');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetreceivedbyaccount(destination).then(res => {
                    done(new Error('Expected plain text'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("getreceivedbyaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetreceivedbyaddress(validHex).then(res => {
                    assert.equal(res, 'getreceivedbyaddress');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGetrawtransaction(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("gettransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGettransaction(validHex).then(res => {
                    assert.equal(res, 'gettransaction');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGettransaction(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("gettxout command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGettxout(validHex, 10, true).then(res => {
                    assert.equal(res, 'gettxout');
                }).catch(err => {
                    done(err);
                });
    
                bc.doGettxout(invHex, 10, true).then(res => {
                    done(new Error('Expected valid hex as first param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doGettxout(validHex, 'falzzy', true).then(res => {
                    done(new Error('Expected integer as second param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("importprivkey command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doImportprivkey(validHex, plainTxt, true).then(res => {
                    assert.equal(res, 'importprivkey');
                }).catch(err => {
                    done(err);
                });
    
                bc.doImportprivkey(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("listaccounts command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListaccounts().then(res => {
                    assert.equal(res, 'listaccounts');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("listreceivedbyaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListreceivedbyaccount().then(res => {
                    assert.equal(res, 'listreceivedbyaccount');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("listreceivedbyaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListreceivedbyaddress().then(res => {
                    assert.equal(res, 'listreceivedbyaddress');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("listsinceblock command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListsinceblock(validHex).then(res => {
                    assert.equal(res, 'listsinceblock');
                }).catch(err => {
                    done(err);
                });
    
                bc.doListsinceblock(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("listtransactions command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListtransactions(plainTxt).then(res => {
                    assert.equal(res, 'listtransactions');
                }).catch(err => {
                    done(err);
                });
    
                bc.doListtransactions(destination).then(res => {
                    done(new Error('Expected plain text'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("listunspent command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListunspent().then(res => {
                    assert.equal(res, 'listunspent');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("listlockunspent command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListlockunspent().then(res => {
                    assert.equal(res, 'listlockunspent');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
        
        it("lockunspent command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doLockunspent(txid_vout_obj).then(res => {
                    assert.equal(res, 'lockunspent');
                }).catch(err => {
                    done(err);
                });
    
                bc.doLockunspent(invHex).then(res => {
                    done(new Error('Expected valid hex to be parsed to object'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("sendfrom command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendfrom(plainTxt, validHex, 4, 2).then(res => {
                    assert.equal(res, 'sendfrom');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSendfrom(destination, validHex, 4, 2).then(res => {
                    done(new Error('Expected plain text as the first param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSendfrom(plainTxt, invHex, 4, 2).then(res => {
                    done(new Error('Expected valid hex as the second param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSendfrom(plainTxt, invHex, 'falzzy', 2).then(res => {
                    done(new Error('Expected integer as the third param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("sendmany command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendmany(plainTxt, addr_r, 5).then(res => {
                    assert.equal(res, 'sendmany');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSendmany(destination, addr_r, 5).then(res => {
                    done(new Error('Expected plain text as the first param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSendmany(plainTxt, invBills, 5).then(res => {
                    done(new Error('Expected valid hex as the second param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSendmany(plainTxt, invBills, 'falzzy').then(res => {
                    done(new Error('Expected integer as the third param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("sendrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendrawtransaction(validHex).then(res => {
                    assert.equal(res, 'sendrawtransaction');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSendrawtransaction(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("sendtoaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendtoaddress(validHex, 6).then(res => {
                    assert.equal(res, 'sendtoaddress');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSendtoaddress(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("setaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSetaccount(validHex, plainTxt).then(res => {
                    assert.equal(res, 'setaccount');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSetaccount(invHex, plainTxt).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSetaccount(validHex, destination).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("settxfee command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSettxfee(7).then(res => {
                    assert.equal(res, 'settxfee');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSettxfee('falzzy').then(res => {
                    done(new Error('Expected integer'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("signmessage command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSignmessage(validHex, plainTxt).then(res => {
                    assert.equal(res, 'signmessage');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSignmessage(invHex, plainTxt).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSignmessage(validHex, destination).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("signrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSignrawtransaction(validHex, txid_vout_scrpubkey_obj, addr_r).then(res => {
                    assert.equal(res, 'signrawtransaction');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSignrawtransaction(invHex, txid_vout_scrpubkey_obj, addr_r).then(res => {
                    done(new Error('Expected valid hex as the first param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSignrawtransaction(validHex, invBills, addr_r).then(res => {
                    done(new Error('Expected valid hex as the second param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doSignrawtransaction(validHex, txid_vout_scrpubkey_obj, invBills).then(res => {
                    done(new Error('Expected valid hex as the third param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("submitblock command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSubmitblock(validHex, addr_r).then(res => {
                    assert.equal(res, 'submitblock');
                }).catch(err => {
                    done(err);
                });
    
                bc.doSubmitblock(invHex).then(res => {
                    done(new Error('Expected valid hex as the first param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("validateaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doValidateaddress(validHex).then(res => {
                    assert.equal(res, 'validateaddress');
                }).catch(err => {
                    done(err);
                });
    
                bc.doValidateaddress(invHex).then(res => {
                    done(new Error('Expected valid hex'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
        
        it("verifymessage command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doVerifymessage(validHex, validHex, plainTxt).then(res => {
                    assert.equal(res, 'verifymessage');
                }).catch(err => {
                    done(err);
                });
    
                bc.doVerifymessage(invHex, validHex, plainTxt).then(res => {
                    done(new Error('Expected valid hex as the first param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doVerifymessage(validHex, invHex, plainTxt).then(res => {
                    done(new Error('Expected valid hex as the second param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                });
    
                bc.doVerifymessage(validHex, invHex, destination).then(res => {
                    done(new Error('Expected plain text as the third param'));
                }).catch(err => {
                    assert.isDefined(err, 'Error correctly thrown');
                    done();
                });
            });
        });
    });
});
