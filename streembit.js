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
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var streembit = streembit || {};

require('app-module-path').addPath(__dirname);

const program = require('commander');
const config = require('libs/config');
const runner = require('runner');
const utils = require("libs/utils");
const Account = require("libs/account");
const async = require('async');
const db = require("./libs/database");
const path = require('path');

// show the command prompt when the user type --help
// and get the configuration values from the command prompt
program
    .version('1.0.1')
    .option('-s, --password [value]', 'Password (secret) to protect the private key')
    .option('-i, --ip [value]', 'IP address for the Streembit seed')
    .option('-p, --port <num>', 'Port for the Streembit client', utils.parse_ipport)
    .option('-d, --data', 'Print node ID')
    .option('-b, --backup', 'Backup node data')
    .parse(process.argv);

var cmd = "run";
if (program.data) {
    cmd = "data";
}
else if (program.backup) {
    cmd = "backup";
}

function display_data() {
    async.waterfall(
        [
            function (callback) {
                db.init_databases(__dirname, callback);
            },
            function (callback) {
                utils.prompt_for_password(callback);
            },
            function (password, callback) {
                var account = new Account();
                account.load(password, callback);
            }
        ],
        function (err, result) {
            if (err) {
                return console.log(err.message || err);
            }

            var account = new Account();
            //print the node ID
            console.log("node ID: %s", account.accountid);
        }
    ); 
}

function backup() {
    console.log("backup account data");
}

function run_application() {
    config.init(program.port, program.ip, program.password, function (err) {
        if (err) {
            return console.log("Configuration initializiation error: " + err);
        }

        console.log("config initialized port: " + config.port + ", ipaddress: " + config.ipaddress)

        try {
            //
            // run the application
            //
            runner();
        }
        catch (e) {
            console.log("runner error: " + e.message);
        }
    });
}


console.log("cmd: " + cmd);

switch (cmd) {
    case "data":
        display_data();
        break;
    case "backup":
        backup();
        break;
    default:
        run_application();
        break;
}