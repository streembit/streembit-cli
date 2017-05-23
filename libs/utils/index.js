
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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var prompt = require('prompt');
var assert = require('assert');

(function () {
    var utils = {
        parse_ipport: function(val) {
            console.log("parse_ipport");
            var port = 0;
            if (val) {
                port = parseInt(val);
            }
            assert(port > 0 && port < 65535, "Invalid port value was entered");
            return port;
        },

        prompt_for_password: function (callback) {
            // show the prompt if the password was not supplied in the cmd line argument nor in the config file
            var schema = {
                properties: {
                    password: {
                        hidden: true
                    }
                }
            };

            prompt.message = "";

            // Since there is no password was provided start the command prompt
            // Get the password from the user via the command prompt
            prompt.start();
            prompt.get(schema, function (err, result) {
                var password = result.password.trim();
                if (!password) {
                    callback(new Error("Invalid password was entered. Enter the password! Spaces are not allowed in the password"));
                }
                else{
                    callback(null, password);
                }
            });

        }
    };

    module.exports = utils;
})();

//class Utils {

//    constructor() {

//    }

//    parse_ipport(val) {
//        console.log("parse_ipport");
//        var port = 0;
//        if (val) {
//            port = parseInt(val);           
//        }
//        assert(ipport > 0 && ipport < 65535, "Invalid port value was entered");
//        return port;
//    }

//    prompt_for_password(callback) {
//        // show the prompt if the password was not supplied in the cmd line argument nor in the config file
//        var schema = {
//            properties: {
//                password: {
//                    hidden: true
//                }
//            }
//        };

//        prompt.message = "";

//        // Since there is no password was provided start the command prompt
//        // Get the password from the user via the command prompt
//        prompt.start();
//        prompt.get(schema, function (err, result) {
//            var password = result.password.trim();
//            assert(password, "Invalid password was entered. Enter the password! Spaces are not allowed in the password");
//            callback(password);
//        });

//    }
//}

//module.export = new Utils();