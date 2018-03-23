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
Author: Streembit team
Copyright (C) 2018 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const config = require("libs/config");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const constants = require("libs/constants");
const HTTPTransport = require("transport/http")
const Account = require("libs/account");
const peermsg = require("libs/message");

const dnsinterval = 600000; // update in every 10 minutes

function dnsupdate() {
    try {
        logger.debug("DNS update");

        var account = new Account();
        var pkeyhash = account.public_key_hash;
        var publickey = account.bs58pk;
        var domain = config.transport.host;
        var crypto_key = account.cryptokey;

        var payload = {
            domain: domain,
            pkeyhash: pkeyhash
        };

        var data = peermsg.create_jwt_token(crypto_key, Date.now(), payload, null, null, publickey);
        var message = JSON.stringify({data: data});

        HTTPTransport.write(message, { host: config.dns.host, port: config.dns.port, protocol: "http" }, "/setdns", (err, msg) => {
            try {
                if (err) {
                    return logger.error("dnsupdate HTTPTransport.write error: %j", err);
                }
                if (!msg) {
                    return logger.error("dnsupdate error: invalid response");
                }
                var resobj = JSON.parse(msg);
                if (resobj.error) {
                    return logger.error("dnsupdate error: " + resobj.error);
                }
                if (resobj.status != 0) {
                    return logger.error("HTTP dnsupdate error: status is not SUCCESS");
                }

                logger.debug("dnsupdate completed");
            }
            catch (exc) {
                logger.error("dnsupdate exception: " + exc.message);
            }
        });
    }
    catch (err) {
        logger.error("DNS update error: %j", err);
    }
}

module.exports.run = function (callback) {
    try {
        var conf = config.dns;
        if (!conf.run) {
            return callback(null, "DNS handler -> not running");
        }

        logger.info("Run streembit DNS handler");

        setInterval(
            () => {
                dnsupdate()
            },
            dnsinterval
        );

        //call the DNS update at the begining
        dnsupdate();

        callback();

        //
    }
    catch (err) {
        callback(err.message);
    }
};