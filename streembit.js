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

require('app-module-path').addPath(__dirname);

const program = require('commander');
const app = require('app');
const utils = require("libs/utils");


// show the command prompt when the user type --help
// and get the configuration values from the command prompt
program
    .version(version)
    .option('-s, --password [value]', 'Password (secret) to protect the private key')
    .option('-i, --ip [value]', 'IP address for the Streembit seed')
    .option('-p, --port <num>', 'Port for the Streembit client', utils.parse_ipport)
    .option('-d, --data', 'Print node ID')
    .option('-b, --backup', 'Backup node data')
    .option('-c, --changepwd', 'Change password')
    .parse(process.argv);


try {
    if (program.data) {
        app.display_data();
    }
    else if (program.backup) {
        app.backup();
    }
    else if (program.changepwd) {
        app.changepwd();
    }
    else {
        app(program.port, program.ip, program.password);
    }
}
catch (e) {
    console.log("app command handler error: " + e.message);
}
