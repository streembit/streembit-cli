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

var config = require('./config');

var program = require('commander');
var assert = require('assert');
var runner = require('./runner');
var prompt = require('prompt');


function parseIpPort(val) {
    var port = 0;
    if (val) {
        port = parseInt(val);
        if (isNaN(port)) {
            console.log("Invald port was entered - will be using the default port");
            port = 0;
        }
    }
    return port;
}

function init(callback) {
    var password = program.password;
    if (!password) {
        //  check the config file
        password = config.password ? config.password : 0;
    }

    if (password) {
        return callback(password);
    }

    // show the prompt if the password was not supplied in the cmd line argument nor in the config file
    var schema = {
        properties: {
            password: {
                hidden: true
            }
        }
    };

    prompt.message = "";

    //
    // Start the prompt
    //
    prompt.start();

    //
    // Get two properties from the user: email, password
    //
    prompt.get(schema, function (err, result) {
        password = result.password.trim();
        assert(password, "Password that protects the private key must exist in the command line arguments or in the config.json file or you must type at the command prompt.");
        callback(password);
    });
}

program
    .version('1.0.1')
    .option('-w, --password [value]', 'Password to protect the private key')
    .option('-i, --ip [value]', 'IP address for the Streembit seed')
    .option('-p, --port <num>', 'Port for the Streembit client', parseIpPort)
    .parse(process.argv);

var ipport = program.port ? program.port : 0;
if (!ipport) {
    //  check the config file
    ipport = config.port;
}

var ipaddress = program.ip;
if (!ipaddress) {
    //  check the config file
    ipaddress = config.ipaddress || 0;
}

// call the init function
init(function (pwd) {
    console.log('port: %j', ipport);
    console.log('ipaddress: %j', ipaddress);

    var opts = {
        ipaddress: ipaddress,
        port: ipport,
        password: password
    };

    //
    // run the application
    //
    runner(opts);
});


