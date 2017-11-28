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


var async = require("async");
var pm2 = require('pm2');
var config = require('./config');

var homedir;

try {
    if (config.homedir) {
        homedir = config.homedir; //grab the next item
    }
}
catch (err) {
    console.log("argument parse error: %j", err);
}

if (!homedir) {
    //  try to get the current directory
    console.log("setting home dir to current directory");
    homedir = require('path').dirname(__filename);
}

console.log("homedir: %s", homedir);

pm2.connect(function (err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
    
    var cwd_value = homedir;

    var pm2config = {
        name    : "streembit",
        script  : 'streembit.js',         
        cwd     : cwd_value
    };
    
    pm2.start(
        pm2config, 
        function (err, apps) {
            if (err) {
                return console.log("pm2.start error: %j", err);
            }
            
            console.log("pm2.start complete");
            process.exit(0);      
        }
    );    
    
});