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
const createHash = require('create-hash');

const AccountDb = require("libs/database/accountdb");
const Account = require("libs/account");
const config = require("libs/config");


class AccountCmds {
    constructor(cmd, callback) {
        this.cmd = cmd;
        this.cb = callback;
        this.acc = new Account();
        this.accountDb = new AccountDb();
        this.account = null;
    }

    run() {
        logger.info("Run account commands handler");
        this.accountDb.data((err, data) => {
            if (err) {
                return this.cb("Account database error: " + (err.message || err));
            }
            if (typeof data === 'undefined') {
                return this.cb("Account was not initialized");
            }

            this.account = data;
            this.command();
        });
    }

    command() {
        const schema = {
            properties: {
                cmd: {
                    description: 'Enter account command',
                    type: 'string',
                    pattern: /^[a-z0-9 ._\$\^%\*\(\)\[\]=!\?\+#@\-]{2,}$/i,
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
        });
    }

    async processInput(inp) {
        const inp_r = inp.split(/\s+/);
        const cmd = inp_r[0];

        try {
            switch (cmd) {
                case 'account':
                    try {
                        await this.changeAccountName(inp_r[1]);
                        console.log('\x1b[32m%s\x1b[0m', 'account name successfully changed');
                    } catch (err) {
                        throw new Error(err.message);
                    }
                    break;
                case 'password':
                    try {
                        await this.changePassword();
                        console.log('\x1b[32m%s\x1b[0m', 'new password successfully activated');
                    } catch (err) {
                        throw new Error(err.message);
                    }
                    break;
                case 'help':
                default:
                    this.helper();
                    break;
            }
            this.command();
        } catch (err) {
            logger.error(err.message);
            console.error('\x1b[31m%s\x1b[0m', '{error}:', err.message);

            this.cmd.run(this.cb);
        }
    }

    changeAccountName(name) {
        return new Promise(async (resolve, reject) => {
            if (!this.acc.validateAccountName(name)) {
                return reject(new Error('Error: Unacceptable account name. Tip (4,64): alphanum, digit, underscore, dash'));
            }

            try {
                await this.accountDb.update_account_name(this.account.accountid, name);
                config.account = name;
                this.account.account = name;
                resolve();
            } catch (err) {
                reject(new Error(err.message));
            }
        });
    }

    changePassword() {
        return new Promise((resolve, reject) => {
            const schema = {
                properties: {
                    old_pwd: {
                        description: 'Old password',
                        type: 'string',
                        pattern: /^[a-z0-9 ._\$\^%\*\+#@\-]{6,}$/i,
                        message: 'Input does not look valid',
                        required: true
                    },
                    new_pwd: {
                        description: 'New password',
                        type: 'string',
                        hidden: true,
                        pattern: /^[a-z0-9 ._\$\^%\*\+#@\-]{6,}$/i,
                        message: 'Input does not look valid',
                        required: true
                    },
                    conf_new_pwd: {
                        description: 'Confirm new password',
                        type: 'string',
                        hidden: true,
                        required: true
                    },
                }
            };

            prompt.message = "";

            prompt.start();

            prompt.get(schema, async (err, result) => {
                if (err) {
                    if (err.message === 'canceled') { // ^C
                        reject('Cancelled');
                    }

                   return reject(err);
                }

                const old_pwd_sha256hex = createHash('sha256').update(result.old_pwd).digest('hex');

                if (this.account.password !== old_pwd_sha256hex) {
                   return reject(new Error('Old password do not match'));
                }
                if (!this.acc.validatePassword(result.new_pwd)) {
                    return reject(new Error('Unacceptable new password. Tip: (6,20) alphanum, special char with no comma, less/greater-than, no tilde/back quote'));
                }
                if (result.new_pwd !== result.conf_new_pwd) {
                    return reject(new Error('Password confirmation failed'));
                }

                const new_pwd_sha256hex = createHash('sha256').update(result.new_pwd).digest('hex');
                const symcrypt_key = this.acc.getCryptPassword(result.new_pwd);
                const cipher = this.acc.genCipher(symcrypt_key);

                try {
                    await this.accountDb.update_password(this.account.accountid, this.acc.accountpk, new_pwd_sha256hex, cipher);
                    this.accountDb.data((err, data) => {
                        if (err) {
                            return reject(new Error(err));
                        }

                        this.acc.load_account(result.new_pwd, data, err => {
                            if (err) {
                                return reject(new Error(err));
                            }

                            this.account.password = new_pwd_sha256hex;
                            resolve();
                        })
                    });
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    helper() {
        console.group('\x1b[32m', "\nAccount Commands:");
        console.log('\x1b[30m', '-------------------');
        console.log('\x1b[34m', 'password', 'no arguments');
        console.log('\x1b[34m', 'account', '<account> plain text. allowed chars: alphanums, underscores, dashes');
        console.log('\x1b[30m', '-------------------');
        console.groupEnd();
    }
}

module.exports = AccountCmds;
