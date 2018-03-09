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

const AccountDb = require("libs/database/accountdb");
const Account = require("libs/account");
const config = require("libs/config");


class AccountCmds {
    constructor(cmd, callback) {
        this.cmd = cmd;
        this.cb = callback;
        this.accountDb = new AccountDb();
        this.account = null;
    }

    run() {
        logger.info("Run account commands handler");
        this.accountDb.data(config.account, (err, data) => {
            if (err) {
                return this.cb("Account database error: " + (err.message || err));
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
                    pattern: /^[a-z0-9 ._\$\^%\*\(\)\[\]=!\?\+#@\-]{6,}$/i,
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
                case 'password':
                    try {
                        await this.changePassword();
                        console.log('\x1b[32m%s\x1b[0m', 'new password activated');
                    } catch (err) {
                        throw new Error(err.message);
                    }
                    break;
                case 'account':
                    try {
                        await this.changeAccountName(inp_r[1]);
                        console.log('\x1b[32m%s\x1b[0m', 'account name successfully changed');
                    } catch (err) {
                        throw new Error(err.message);
                    }
                    break;
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

    changePassword() {
        return new Promise((resolve, reject) => {
            const schema = {
                properties: {
                    old_pwd: {
                        description: 'Enter old password',
                        type: 'string',
                        pattern: /^[a-z0-9 ._\$\^%\*\(\)\[\]=!\?\+#@\-]{6,}$/i,
                        message: 'Input does not look valid',
                        required: true
                    },
                    new_pwd: {
                        description: 'Enter new password',
                        type: 'string',
                        pattern: /^[a-z0-9 ._\$\^%\*\(\)\[\]=!\?\+#@\-]{6,}$/i,
                        message: 'Input does not look valid',
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

                const acc = new Account();

                const old_pwd_sha256hex = acc.getCryptPassword(result.old_pwd);
                if (this.account.password !== old_pwd_sha256hex) {
                   reject(new Error('Old password do not match'));
                }
                if (!this.validatePassword(result.new_pwd)) {
                    reject(new Error('Unacceptable new password. Tip: (6,20) alphanum, special char with no less/greater-than, no tilde/back quote'));
                }

                const new_pwd_sha256hex = acc.getCryptPassword(result.new_pwd);
                try {
                    await this.accountDb.update_password(this.account, new_pwd_sha256hex);
                    config.password = new_pwd_sha256hex;
                    this.account.password = new_pwd_sha256hex;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    changeAccountName(name) {
        return new Promise(async (resolve, reject) => {
            if (!this.validateAccountName(name)) {
                return reject(new Error('Unacceptable account name. Tip (4,64): alphanum, digit, underscore, dash'));
            }

            try {
                await this.accountDb.update_account_name(this.account.account, name);
                config.account = name;
                this.account.account = name;
                resolve();
            } catch (err) {
                reject(new Error(err.message));
            }
        });
    }

    validatePassword(pwd) {
        if (!(pwd && /^[a-z0-9._\$\^%\*\(\)\[\]=!\?\+#@\-]{6,20}$/i.test(pwd)) ||
            pwd.replace(/[^a-z]/gi, '').length < 2 ||
            pwd.replace(/[^0-9]/g, '').length < 1
        ) {
            return false;
        }

        return true;
    }

    validateAccountName(txt) {
        if (!(txt && /^[a-z0-9_\-]{4,64}$/i.test(txt)) ||
                txt.replace(/[^a-z]/gi, '').length < 2 ||
                txt.replace(/[^0-9]/g, '').length < 1
        ) {
            return false;
        }

        return true;
    }

    helper() {
        console.group('\x1b[32m', "\nAccount Commands:");
        console.log('\x1b[30m', '-------------------');
        console.log('\x1b[34m', 'password', 'no arguments');
        console.log('\x1b[34m', 'account', '<account> plain text. allowed chars: alphanums, digits, underscores, dashes');
        console.log('\x1b[30m', '-------------------');
        console.groupEnd();
    }
}

module.exports = AccountCmds;
