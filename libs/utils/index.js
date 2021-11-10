﻿/*

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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

"use strict";

/*
Imports here
*/

export class Utils {
  parse_ipport(val) {
    console.log("parse_ipport");
    var port = 0;
    if (val) {
      port = parseInt(val);
    }
    assert(port > 0 && port < 65535, "Invalid port value was entered");
    return port;
  }

  prompt_for_password(callback) {
    // show the prompt if the password was not supplied in the cmd line argument nor in the config file
    var schema = {
      properties: {
        password: {
          description: "Enter password",
          type: "string",
          hidden: true,
          pattern: /^[a-z0-9._\$\^%\*\(\)\[\]=!\?\+#@\-]{6,20}$/i,
          message: "Password does not look valid",
          required: true,
        },
      },
    };

    prompt.message = "";

    // Since there is no password was provided start the command prompt
    // Get the password from the user via the command prompt
    prompt.start();
    prompt.get(schema, (err, result) => {
      var password = result.password.trim();
      if (!password) {
        callback(
          new Error(
            "Invalid password was entered. Enter the password! Allowed chars: alphanum, special chars with exception of comma, less/greater-than, tilde, backquote"
          )
        );
      } else {
        callback(null, password);
      }
    });
  }

  prompt_for_userid(callback) {
    // show the prompt if the password was not supplied in the cmd line argument nor in the config file
    var schema = {
      properties: {
        userid: {
          description: "Enter the user ID to be deleted",
          type: "integer",
          message: "The user ID must be am integer",
          required: true,
        },
      },
    };

    prompt.message = "";

    // Since there is no password was provided start the command prompt
    // Get the password from the user via the command prompt
    prompt.start();
    prompt.get(schema, (err, result) => {
      var userid = result.userid;
      callback(null, userid);
    });
  }

  is_ipaddress(address) {
    var ipPattern =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/; // /^(\d{ 1, 3 })\.(\d { 1, 3 })\.(\d { 1, 3 })\.(\d { 1, 3 })$/;
    var valid = ipPattern.test(address);
    return valid;
  }

  is_valid_domain(v) {
    if (!v) return false;
    var re =
      /^(?!:\/\/)([a-zA-Z0-9-]+\.){0,5}[a-zA-Z0-9-][a-zA-Z0-9-]+\.[a-zA-Z]{2,64}?$/gi;
    return re.test(v);
  }

  ensure_seeds(seeds) {
    if (!seeds || !Array.isArray(seeds)) {
      return null;
    }

    var result = [];
    // ensure the ports of the seeds are correct
    seeds.forEach((item, index, array) => {
      if (!item.port) {
        item.port = constants.DEFAULT_STREEMBIT_PORT;
      }

      if (!item.host) {
        throw new Error(
          "Invalid seed configuration entry. The host must be defined."
        );
      }

      var isip = utils.is_ipaddress(item.host);
      if (!isip) {
        if (!utils.is_valid_domain(item.host)) {
          throw new Error(
            "Invalid seed configuration entry. The host must be a valid IP address or domain name."
          );
        }
      }

      result.push({
        host: item.host,
        port: item.port,
        publickey: item.publickey,
      });
    });

    return result;
  }

  shuffle(array) {
    var currentIndex = array.length,
      temporaryValue,
      randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }
}
