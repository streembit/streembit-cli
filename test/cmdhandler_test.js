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
const peermsg = require("libs/message");
const AccountCmds = require('libs/account/cmds');
const Account = require('libs/account');
const UsersCmds = require('libs/users/cmds');
const Users = require('libs/users');

const dbschema = require("dbschematest");
const database = require("streembit-db").instance;
const sqlite3 = require('sqlite3').verbose();
const ecckey = require('libs/crypto');
const createHash = require('create-hash');
const secrand = require('secure-random');


describe("CMD Handlers", function () {
    let stdout, out, cmd, ac, usr;

    before(function(done) {
        config.init(config_json.transport.port, config_json.transport.host, true, false, () => {
            cmd = new CmdHandler();
            logger.init('debug', null, ['file']);
            done();
        })
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
    
    describe("Account commands handler", function() {
        let run_account_tests = true, pk = null, account = new Account();
        const sq3 = new sqlite3.Database('db/sqlite/streembittest/streembittest.db', sqlite3.OPEN_READWRITE);
        
        const genCipher = function genCipher(smk) {
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
            
            pk = key.pkrmd160hash;
            
            return peermsg.aes256encrypt(smk, JSON.stringify(user_context));
        };
        
        before(function(done) {
            database.init(dbschema, async function () {
                ac = new AccountCmds(cmd, err => { out = err });
                await sq3.run("DELETE FROM accounts", []);
                
                const account_name = 'test';
                let password = 'puzs550rd';
                const salt = createHash('sha256').update(password).digest('hex');
                password = createHash('sha256').update(salt).digest('hex');
                const cipher = genCipher(password);
                
                await sq3.run(
                    "INSERT INTO accounts (account,accountpk,password,cipher) VALUES (?,?,?,?)",
                    [account_name, pk, password, cipher]
                );
                await sq3.get(
                    "SELECT * FROM accounts ORDER BY ROWID ASC LIMIT 1",
                    [],
                    function (err, row) {
                        ac.account = row;
                        ac.accountDb.setDB(sq3);
                        done();
                    }
                );
            });
        });
        
        it("should show the account commands prompt", function() {
            stdout = capcon.interceptStdout(function capture() {
                ac.command();
            });
            
            if (stdout.toLowerCase().includes('not initialized')) {
                run_account_tests = false;
                assert.isNotOk(run_account_tests, "account was not initialized yet");
            } else {
                assert.include(stdout, 'Enter');
            }
        });
        
        if (run_account_tests) {
            it("should validate input for account name", function() {
                const validchars = "abcdefghijklm_nopqrstuvwxyz-ABCDEFGHIJKLM-NOPQRSTUVWXYZ0_123456789";
                const name = Array(12).join().split(',').map(() => validchars.charAt(Math.floor(Math.random() * validchars.length))).join('');
                assert.isTrue(account.validateAccountName(name));
                assert.isFalse(account.validateAccountName('in<val:'));
            });
            
            it("should validate password input", function() {
                assert.isTrue(account.validatePassword('p#a-S8w_*D'));
                assert.isFalse(account.validatePassword('pa<sW/r`d'));
            });
            
            it("should change account name", function(done) {
                ac.changeAccountName('name').then(err => {
                    if (err) {
                        assert.isNotOk(err, 'It must not throw on valid account name');
                        done();
                    }
                    
                    sq3.get(
                        "SELECT * FROM accounts ORDER BY ROWID ASC LIMIT 1",
                        [],
                        function (err, row) {
                            assert.equal(row.account, 'name');
                            done();
                        }
                    );
                });
            });
            
            it("should prompt for password", function(done) {
                stdout = capcon.interceptStdout(async function capture() {
                    await ac.changePassword();
                });
                
                assert.include(stdout.toLowerCase(), 'old password');
                done();
            });
        }
    });
    
    describe("User commands handler", function () {
        const username = 'test',
            pk = '5810cc4e420e391775396d912b7356bee60658ea38ce89ceec4d223dd2fd3803',
            users = new Users(),
            sq3 = new sqlite3.Database('db/sqlite/streembittest/streembittest.db', sqlite3.OPEN_READWRITE);
        
        let userlist;
        
        before(function() {
            database.init(dbschema, async function () {
                usr = new UsersCmds(cmd, err => { out = err });
                await sq3.run("DELETE FROM users", []);
                usr.usersDb.setDB(sq3);
            });
        });
        
        after(function () {
            setTimeout(() => {
                process.emit("SIGINT");
            }, 200);
        });
        
        it("should show the users prompt", function () {
            stdout = capcon.interceptStdout(function capture() {
                usr.run();
            });
            
            assert.include(stdout, 'Enter');
        });
        
        it("should have a schema for add/update prompt", function () {
            assert.isObject(usr.add_update_schema);
            assert.isTrue(usr.add_update_schema.hasOwnProperty('properties'));
            try {
                assert.hasAllKeys(usr.properties, ['username', 'pk', 'isadmin', 'settings']);
            } catch (e) {}
        });
        
        it("should validate username", function() {
            assert.isTrue(users.validateUsername(username));
            assert.isFalse(users.validateUsername(username+ 'i^v@[i)'));
        });
        
        it("should validate 1/0 input (used for isadmin)", function () {
            assert.isTrue(users.validate10(1));
            assert.isTrue(users.validate10(0));
            assert.isFalse(users.validate10(2));
            assert.isFalse(users.validate10('naN'));
        });
        
        it("should validate public key", function () {
            assert.isTrue(users.validatePk(pk));
            
            const pk_inv1 = pk.replace(/[e123]/g, 'X');
            const pk_inv2 = pk.split('').slice(0,30).join('');
            assert.isFalse(users.validatePk(pk_inv1));
            assert.isFalse(users.validatePk(pk_inv2));
        });
        
        it("should validate JSON string", function () {
            assert.isTrue(users.validateJSON(''));
            assert.isTrue(users.validateJSON('[{"fst":1,"snd":2,"thd":3},{"thd":3,"snd":2,"fst":1}]'));
            assert.isFalse(users.validateJSON(username));
            assert.isFalse(users.validateJSON([{fst:1,snd:2,thd:3}, {thd:3, snd:2, fst:1}]));
        });
        
        it("should add a user to database", async function () {
            await usr.processAddUser(username, pk, '', '');
            userlist = await usr.usersDb.getall();
            assert.isTrue(userlist.some(u => {
                if (u.publickey === pk) {
                    return true;
                }
            }));
        });
    });
});
