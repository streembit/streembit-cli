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

var DEFAULT_STREEMBIT_PORT = 32320;

var program = require('commander');
var config = require('./config');
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
//var account = require("./account");
//var peernet = require("./peernet");
//var bootclient = require("./bootclient");
//var seeds = require("./seeds");


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
    .option('-s, --seednode', 'Run as a seed node')
    .option('-b, --blockchain', 'Run as a blockchain node')
    .option('-t, --iot', 'Run as an IoT device node')
    .parse(process.argv);

var ipport = program.port ? program.port : 0;
if (!ipport) {
    //  check the config file
    ipport = config.port;
    if (!ipport) {
        ipport = DEFAULT_STREEMBIT_PORT;
    }
}

var ipaddress = program.ip;
if (!ipaddress) {
    //  check the config file
    ipaddress = config.ipaddress || 0;
}

var isseednode = program.seednode ? program.seednode : false;
if (!isseednode) {
    //  check the config file
    isseednode = config.seed_node.run ? true : false;
}

var isblockchain = program.blockchain ? program.blockchain : false;
if (!isblockchain) {
    //  check the config file
    isblockchain = config.blockchain_node.run ? true : false;
}


var isiot = program.iot ? program.iot : false;
var isiot = program.isiot ? program.isiot : false;
if (!isiot) {
    //  check the config file
    isiot = config.iot_node.run ? true : false;
}

var password = program.password;
if (!password) {
    //  check the config file
    password = config.password ? config.password : 0;
}
assert(password, "Password that protects the private key must exist in the command line arguments or in the config.json file");

console.log('port: %j', ipport);
console.log('ipaddress: %j', ipaddress);
console.log('seednode: %j', isseednode);
console.log('blockchain: %j', isblockchain);
console.log('password: %j', isiot);
--console.log('password: %j', password);



/*
var DEFAULT_STREEMBIT_PORT = 32320;

var config = require('./config');

var logger = require("streembitlib/logger/logger");
global.applogger = logger;

var assert = require('assert');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
var wotkad = require('streembitlib/kadlib');
streembit.account = require("./account");
streembit.peernet = require("./peernet");
streembit.bootclient = require("./bootclient");
var Seeds = require("./seeds");

assert(config.node, "node field must exists in the config.json file");
assert(config.node.address && typeof config.node.address == "string" && config.node.address.trim().length > 0, "valid address must must exists in the config.node field");
assert(config.node.seeds, "seeds must exists in the config.node field");
assert(Array.isArray(config.node.seeds), 'Invalid seeds supplied. "seeds" must be an array');

if (!config.node.port) {
    config.node.port = DEFAULT_STREEMBIT_PORT; 
}

var is_seed_node = config.is_seed_node;

// ensure the ports of the seeds are correct
config.node.seeds.forEach(function (item, index, array) {
    if (!item.address || typeof item.address != "string" || item.address.trim().length == 0) {
        throw new Error("Application error: address for a seed is required")
    }
    if (!item.port) {
        item.port = DEFAULT_STREEMBIT_PORT;
    }
});

// initialize the database path
var maindb_path = path.join(__dirname, 'db', 'streembitdb');

async.waterfall(
    [
        function (callback) {
            var wdir = process.cwd();
            var logspath = path.join(wdir, 'logs');
            var loglevel = config.log && config.log.level ? config.log.level : "debug";
            logger.init(loglevel, logspath, null, callback);
        },      
        function (callback) {
            // create the db directory
            logger.info("initializing database, maindb_path: %s", maindb_path);
            var exists = fs.existsSync(maindb_path);
            if (exists) {
                return callback();
            }
             
            logger.info("Creating database directory ...");
            var dbdir_path = path.join(__dirname, 'db');
            try {
                fs.mkdirSync(dbdir_path);
            }
            catch (e) {
                return callback("creating database error: " + e.message);
            }
            try {
                fs.mkdirSync(maindb_path);
            }
            catch (e) {
                return callback("creating database error: " + e.message);
            }

            exists = fs.existsSync(maindb_path);
            if (!exists) {
                callback("Unable to create data directory");
            }
            else {
                logger.info("DB directory created");
                callback();
            }

        },    
        function (callback) {
            streembit.account.create(callback);
        },
        function (callback) {
            // get the seeds
            var seedhandler = new Seeds();
            seedhandler.load(callback);
        },
        function (seeds, callback) {
            try {
                var maindb = levelup(maindb_path);
                callback(null, seeds, maindb);
            }
            catch (e) {
                callback("create database error: " + e.message);
            }
        },
        function (seeds, maindb, callback) {
            streembit.peernet.start(maindb, seeds, callback);
        }
    ], 
    function (err, result) {
        if (err) {
            console.log("Main init error: %j", err);
            logger.error("Main init error: %j", err);
        }
    }
);

*/
