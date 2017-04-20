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
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
var logger = require("./libs/logger");
var seedrunner = require("./modules/seed");
var clientrunner = require("./modules/client");
var bcrunner = require("./modules/blockchain");
var iotrunner = require("./modules/iot");
var db = require("./libs/database");

// initialize the logger
function initialize_logger(callback) {
    var wdir = process.cwd();
    var logspath = path.join(wdir, config.log.logs_dir || "logs");
    var loglevel = config.log && config.log.level ? config.log.level : "debug";
    logger.init(loglevel, logspath, null, callback);
}


module.exports = exports = function (opts) {

    async.waterfall(
        [
            initialize_logger,
            function (callback) {
                db.init_streembitdb(__dirname, callback);
            },            
            function (callback) {
                seedrunner(opts, callback);
            },
            function (callback) {
                clientrunner(opts, callback);
            },
            function (callback) {
                bcrunner(callback);
            },
            function (callback) {
                iotrunner(callback);
            }        
        ],
        function (err, result) {
            if (err) {
                console.log("application init error: %j", err);
                return logger.error("application init error: %j", err);
            }

            logger.info("The application has been initialized.")
        }
    );

};