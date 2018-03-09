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


const assert = require('chai').assert;
const logger = require('streembit-util').logger;
const capcon = require('capture-console');

const res = require('../resolvedir');
const config_json = require('../config');
const config = require('libs/config');
const CmdHandler = require('apps/cmd');
const BlockchainCmds = require('apps/blockchain/cmds');


describe("CMD Handler", function () {
    let stdout, out, cmd, bc;

    before(function(done) {
        config.init(config_json.transport.port, config_json.transport.host, config_json.password, () => {
            cmd = new CmdHandler();
            logger.init('debug', null, ['file']);
            done();
        })
    });

    describe("Blockchain Commands, validation", function () {
        const plainTxt = "Eeny meeny miny moe Catch a tiger by the toe";

        before(function() {
            bc = new BlockchainCmds(cmd, err => { out = err }, { name: 'blockchain', run: true });
        });

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
        const txid_vout_obj = "5B7B2274786964223A223533373437323635363536643632363937343230363236633666363336623633363836313639366532303637363536653635373336393733323036323663366636333662222C22766F7574223A307D2C7B2274786964223A2261353639373163326665646138313931626166646633383932313936623138366532653833313131346138326562363136663963646335333265316566623965222C22766F7574223A317D5D";
        const txid_vout_scrpubkey_obj = "5B7B2274786964223A223533373437323635363536643632363937343230363236633666363336623633363836313639366532303637363536653635373336393733323036323663366636333662222C22766F7574223A312C227363726970745075624B6579223A2239656662316532653533646339633666363165623832346131313331653865323836623139363231383966336664626139313831646166656332373136396135227D2C7B2274786964223A2261353639373163326665646138313931626166646633383932313936623138366532653833313131346138326562363136663963646335333265316566623965222C22766F7574223A322C227363726970745075624B6579223A223533373437323635363536643632363937343230363236633666363336623633363836313639366532303637363536653635373336393733323036323663366636333662227D5D";
        const addr_amt_r = "7B2261396639383234336433633162646666386561346262633134383734653937316163366663363363653735343265666161326261616530393831303239383436223A312E3233342C2237363830616465633865616263616261633637366265396538333835346164653062643232636462223A327D";
        const addr_r = "5B2261396639383234336433633162646666386561346262633134383734653937316163366663363363653735343265666161326261616530393831303239383436222C2237363830616465633865616263616261633637366265396538333835346164653062643232636462225D";

        before(function() {
            bc = new BlockchainCmds(cmd, err => { out = err }, { name: 'blockchain', run: true });
        });

        it("backupwallet command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doBackupwallet(destination).then(res => {
                    assert.equal(res, 'backupwallet');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("createrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doCreaterawtransaction(txid_vout_obj, addr_amt_r).then(res => {
                    assert.equal(res, 'createrawtransaction');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("decoderawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doDecoderawtransaction(validHex).then(res => {
                    assert.equal(res, 'decoderawtransaction');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("dumpprivkey command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doDumpprivkey(validHex).then(res => {
                    assert.equal(res, 'dumpprivkey');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("dumpwallet command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doDumpwallet(destination).then(res => {
                    assert.equal(res, 'dumpwallet');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("encryptwallet command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doEncryptwallet(plainTxt).then(res => {
                    assert.equal(res, 'encryptwallet');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("getaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetaccount(validHex).then(res => {
                    assert.equal(res, 'getaccount');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("getaccountaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetaccountaddress(plainTxt).then(res => {
                    assert.equal(res, 'getaccountaddress');
                    done();
                }).catch(err => {
                    done(new Error(err));
                });
            });
        });

        it("getaddressesbyaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetaddressesbyaccount(plainTxt).then(res => {
                    assert.equal(res, 'getaddressesbyaccount');
                    done();
                }).catch(err => {
                    done(err);
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
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("getblock command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetblock(validHex).then(res => {
                    assert.equal(res, 'getblock');
                    done();
                }).catch(err => {
                    done(err);
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
                    done();
                }).catch(err => {
                    done(err);
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
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("getrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetreceivedbyaccount(plainTxt).then(res => {
                    assert.equal(res, 'getreceivedbyaccount');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("getreceivedbyaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGetreceivedbyaddress(validHex).then(res => {
                    assert.equal(res, 'getreceivedbyaddress');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("gettransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGettransaction(validHex).then(res => {
                    assert.equal(res, 'gettransaction');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("gettxout command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doGettxout(validHex, 10, true).then(res => {
                    assert.equal(res, 'gettxout');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("importprivkey command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doImportprivkey(validHex, plainTxt, true).then(res => {
                    assert.equal(res, 'importprivkey');
                    done();
                }).catch(err => {
                    done(err);
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
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("listtransactions command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doListtransactions(plainTxt).then(res => {
                    assert.equal(res, 'listtransactions');
                    done();
                }).catch(err => {
                    done(err);
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
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("sendfrom command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendfrom(plainTxt, validHex, 4, 2).then(res => {
                    assert.equal(res, 'sendfrom');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("sendmany command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendmany(plainTxt, addr_r, 5).then(res => {
                    assert.equal(res, 'sendmany');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("sendrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendrawtransaction(validHex).then(res => {
                    assert.equal(res, 'sendrawtransaction');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("sendtoaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSendtoaddress(validHex, 6).then(res => {
                    assert.equal(res, 'sendtoaddress');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("setaccount command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSetaccount(validHex, plainTxt).then(res => {
                    assert.equal(res, 'setaccount');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("settxfee command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSettxfee(7).then(res => {
                    assert.equal(res, 'settxfee');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("signmessage command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSignmessage(validHex, plainTxt).then(res => {
                    assert.equal(res, 'signmessage');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("signrawtransaction command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSignrawtransaction(validHex, txid_vout_scrpubkey_obj, addr_r).then(res => {
                    assert.equal(res, 'signrawtransaction');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("submitblock command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doSubmitblock(validHex, addr_r).then(res => {
                    assert.equal(res, 'submitblock');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("validateaddress command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doValidateaddress(validHex).then(res => {
                    assert.equal(res, 'validateaddress');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });

        it("verifymessage command", function (done) {
            stdout = capcon.interceptStdout(function capture() {
                bc.doVerifymessage(validHex, validHex, plainTxt).then(res => {
                    assert.equal(res, 'verifymessage');
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
    });

    describe("CmdHandler: command prompt", function () {
        it("should not show logger strings in console", function () {
            stdout = capcon.interceptStdout(function capture() {
                logger.debug('Running CMD tests');
            });

            assert.isEmpty(stdout);
        });

        it('should show help for invalid input', function () {
            stdout = capcon.interceptStdout(function capture() {
                cmd.processInput('not-a-command', ()=>{});
            });

            assert.include(stdout, 'Streembit Commands:');
        });

        it('should show initial command prompt', function () {
            stdout = capcon.interceptStdout(function capture() {
                cmd.run(()=>{});
            });

            assert.include(stdout, 'Enter');
        });
    });

    describe("Blockchain handler init", function () {

        before(function() {
            bc = new BlockchainCmds(cmd, err => { out = err }, { name: 'blockchain', run: true });
        });

        after(function () {
            setTimeout(() => {
                process.emit("SIGINT");
            }, 200);
        });

        it("should have an array of valid commands", function () {
            assert.isArray(bc.validCmd);
            assert.isAtLeast(bc.validCmd.length, 10);
        });

        it("should not start blockchain commands handler if blockchain config has run key set to false", function () {
            bc.active = false;
            bc.run();

            assert.include(out, 'error:');
        });

        it("should show help for invalid input", function () {
            stdout = capcon.interceptStdout(function capture() {
                bc.processInput('not-a-command');
            });

            assert.include(stdout, 'Blockchain Commands:');
        });

        it("should show command prompt for blockchain commands", function () {
            bc.active = true;
            stdout = capcon.interceptStdout(function capture() {
                bc.run();
            });

            assert.include(stdout, 'Enter');
        });
    });
});
