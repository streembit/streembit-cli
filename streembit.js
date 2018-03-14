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

const pinfo = require('./package.json');
const version = pinfo.version;
// resolve the directories for require
const res = require('./resolvedir');

const program = require('commander');
const app = require('app');
const utils = require("libs/utils");


// show the command prompt when the user type --help
// and get the configuration values from the command prompt
program
    .version(version)
    .option('-pwd, --pwd [pwd]', 'Password (secret) to protect the private key')
    .option('-pm2, --pm2', 'PM2 or service/daemon mode')
    .option('-i, --ip [value]', 'IP address for the Streembit seed')
    .option('-p, --port <num>', 'Port for the Streembit client', utils.parse_ipport)
    .option('-d, --data', 'Print node ID')
    .option('-b, --backup', 'Backup node data')
    .option('-c, --changepwd', 'Change password')
    .option('-u, --users', 'List users')
    .option('-r, --deluser [pkey]', 'Delete user')
    .option('-w, --whitelist [pkey]', 'Add/Remove a user to/from whitelist')
    .option('-a, --addpk [pkey]', 'Add/Remove a user to/from whitelist')
    .parse(process.argv);


try {
    if (!program.pwd || typeof program.pwd !== 'string' || program.pwd.length < 6) {
        console.log('\x1b[31m%s\x1b[0m', 'Error:', 'Password required! Restart the app with --pwd PASSWORD or --pwd=PASSWORD');
        process.exit(1);
    }
    if (program.data) {
        app.display_data(program.pwd);
    }
    else if (program.backup) {
        app.backup(program.pwd);
    }
    else if (program.users) {
        app.list_users(program.pwd);
    }
    else if (program.whitelist) {
        if (!program.addpk && !program.deluser) {
            throw new Error('-w command option requires user private key being provided');
        } else if (
            (program.addpk && program.addpk.length < 64) ||
            (program.deluser && program.deluser.length < 64)
        ) {
            throw new Error('Invalid public key');
        }

        app.whitelist_update(program.pwd, program.addpk || program.deluser, !!program.deluser);
    }
    else if (program.deluser) {
        app.delete_user(program.pwd);
    }
    else {
        app(program.port, program.ip, program.pwd);
    }
}
catch (e) {
    console.log("app command handler error: " + e.message);
}
