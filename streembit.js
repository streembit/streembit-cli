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

program
    .version('1.0.1')
    .option('-w, --password [value]', 'Password to protect the private key')
    .option('-i, --ip [value]', 'IP address for the Streembit seed')
    .option('-p, --port <num>', 'Port for the Streembit client', parseIpPort)
    .option('-c, --client', 'Run as a streembit client')
    .option('-s, --seednode', 'Run as a seed node')
    .option('-b, --blockchain', 'Run as a blockchain node')
    .option('-t, --iot', 'Run as an IoT device node')
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

var is_streembit_client = program.client ? program.client : false;
if (!is_streembit_client) {
    //  check the config file
    is_streembit_client = config.func_client.run ? true : false;
}

var is_seednode = program.seednode ? program.seednode : false;
if (!is_seednode) {
    //  check the config file
    is_seednode = config.func_seed.run ? true : false;
}

var is_blockchain = program.blockchain ? program.blockchain : false;
if (!is_blockchain) {
    //  check the config file
    is_blockchain = config.func_blockchain.run ? true : false;
}


var is_iothandler = program.iot ? program.iot : false;
var is_iothandler = program.isiot ? program.isiot : false;
if (!is_iothandler) {
    //  check the config file
    is_iothandler = config.func_iot.run ? true : false;
}

var password = program.password;
if (!password) {
    //  check the config file
    password = config.password ? config.password : 0;
}

// show the prompt if the password was not supplied in the cmd line argument nor in the config file
if (!password) {
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
        password = result.password;
        assert(password, "Password that protects the private key must exist in the command line arguments or in the config.json file or you must type at the command prompt.");
        run();
    });
}
else {
    run();
}

function run() {
    console.log('port: %j', ipport);
    console.log('ipaddress: %j', ipaddress);
    console.log('client: %j', is_streembit_client);
    console.log('seednode: %j', is_seednode);
    console.log('blockchain: %j', is_blockchain);
    console.log('isiot: %j', is_iothandler);

    var opts = {
        client: is_streembit_client,
        seed: is_seednode,
        blockc: is_blockchain,
        iot: is_iothandler,
        pwd: password
    };

    //
    // run the application
    //
    runner(opts);
}


