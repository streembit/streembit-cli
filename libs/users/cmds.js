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


const prompt = require("prompt");
const bs58check = require('bs58check');
const createHash = require('create-hash');
const logger = require("streembit-util").logger;

const Users = require("./");
const UsersDb = require("libs/database/usersdb");


class UsersCmds {
    constructor(cmd, callback) {
        this.cmd = cmd;
        this.cb = callback;
        this.users = new Users();
        this.usersDb = new UsersDb();

        this.add_update_schema = {
            properties: {
                username: {
                    description: 'Username',
                    type: 'string',
                    conform: value => this.users.validateUsername(value),
                    message: 'Invalid username. Allowed chars: alphanum (2,40)',
                },
                pk: {
                    description: 'Public Key',
                    type: 'string',
                    conform: value => this.users.validatePk(value),
                    message: 'Invalid public key. We expect a hex string (128,256)',
                },
                isadmin: {
                    description: 'Admin [1,0] (default 0)',
                    type: 'integer',
                    conform: value => this.users.validate10(value),
                    message: 'Invalid value. It is either 1 for admin, or 0 for regular user',
                },
                settings: {
                    description: 'Settings',
                    type: 'string',
                    conform: value => this.users.validateJSON(value),
                    message: 'Invalid value. We expect JSON string',
                }
            }
        };
    }

    run() {
        logger.info("Run users commands handler");

        this.command();
    }

    command() {
        const schema = {
            properties: {
                cmd: {
                    description: 'Enter users command',
                    type: 'string',
                    pattern: /^[a-z0-9 ]{3,}$/i,
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
                case 'add':
                    try {
                        await this.addUser();
                        console.log('\x1b[32m%s\x1b[0m', 'user successfully added');
                    } catch (err) {
                        throw new Error(err.message);
                    }
                    break;
                case 'delete':
                    try {
                        await this.deleteUser(inp_r[1]);
                        console.log('\x1b[32m%s\x1b[0m', 'user successfully deleted');
                    } catch (err) {
                        throw new Error(err.message);
                    }
                    break;
                case 'update':
                    try {
                        await this.updateUser(inp_r[1]);
                        console.log('\x1b[32m%s\x1b[0m', 'user successfully updated');
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

    addUser() {
        return new Promise((resolve, reject) => {
            console.log('\x1b[34m%s\x1b[0m', 'Hint:','Username, Public Key, Admin and Settings are optional. Hit [enter] to bypass');
            prompt.start();

            prompt.get(this.add_update_schema, async (err, result) => {
                if (err) {
                    if (err.message === 'canceled') { // ^C
                        reject('Cancelled');
                    }

                    return reject(err);
                }

                let { username, pk, isadmin, settings } = result;

                try {
                    await this.processAddUser(username, pk, isadmin, settings);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    async processAddUser(username, pk, isadmin, settings) {
        const users = await this.usersDb.getall();

        if (!pk || !pk.length) {
            throw new Error('Private key is mandatory');
        }

        if (users.some(u =>
                {
                    if (u.publickey === pk) {
                        return true;
                    }
                }
            )
        ) {
            throw new Error('This public key is already in the database');
        }


        if (!username || !username.length) {
            username = '';
        }

        var admin = isadmin == 1 ? isadmin : 0;

        if (!settings || !settings.length) {
            settings = '{}';
        }

        const buffer = new Buffer(pk, 'hex');
        const rmd160buffer = createHash('rmd160').update(buffer).digest();
        const pkhash = bs58check.encode(rmd160buffer);

        try {
            await this.usersDb.add_user(pkhash, pk, username, admin, settings);
        } catch (err) {
            throw new Error(err);
        }
    }

    updateUser(update_pk) {
        return new Promise(async (resolve, reject) => {
            //find user by public key or public key hash
            try {
                const user = await this.usersDb.get_user(update_pk);
                if (!user) {
                    return reject(new Error('User not found'));
                }
            } catch (err) {
                return reject(err);
            }

            prompt.start();

            prompt.get(this.add_update_schema, async (err, result) => {
                if (err) {
                    if (err.message === 'canceled') { // ^C
                        return reject(new Error('Cancelled'));
                    }

                    return reject(err);
                }

                let { username, pk, isadmin, settings } = result;
                let update = {};

                if (username && username.length) {
                    update['username'] = username;
                }
                if (isadmin && isadmin.length) {
                    update['isadmin'] = isadmin;
                }
                if (pk && pk.length) {
                    update['publickey'] = pk;
                    const buffer = new Buffer(pk, 'hex');
                    const rmd160buffer = createHash('rmd160').update(buffer).digest();
                    update['pkhash'] = bs58check.encode(rmd160buffer);
                }
                if (settings && settings.length) {
                    update['settings'] = settings;
                }

                if (Object.keys(update).length) {
                    try {
                        await this.usersDb.update_user(update_pk, update);
                    } catch (err) {
                        return reject(new Error(err));
                    }
                } else {
                    return reject (new Error('Nothing to update'));
                }

                resolve();
            });
        });
    }

    deleteUser(pk) {
        return new Promise(async (resolve, reject) => {
            let user;
            try {
                user = await this.usersDb.get_user(pk);
                if (!user) {
                    return reject(new Error('User not found'));
                }
            } catch (err) {
                return reject(new Error(err));
            }

            try {
                await this.usersDb.delete_user(user.userid);
            } catch (err) {
                return resolve(err);
            }

            resolve();
        });
    }

    helper() {
        console.group('\x1b[32m', "\nUsers Commands:");
        console.log('\x1b[30m', '-------------------');
        console.log('\x1b[34m', 'add', 'no arguments');
        console.log('\x1b[34m', 'delete', '[public key] or [pkhash] valid public key or public key hash');
        console.log('\x1b[34m', 'update', '[public key] or [pkhash] valid public key or public key hash');
        console.log('\x1b[30m', '-------------------');
        console.groupEnd();
    }
}

module.exports = UsersCmds;
