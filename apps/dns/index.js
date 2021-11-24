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

import { config } from "../../libs/config/index.js";
import { logger } from "streembit-util";
import HTTPTransport from "../../transport/http/index.js";
import { Account } from "../../libs/account/index.js";
import * as peermsg from "../../libs/message/index.js";

const dnsinterval = 600000; // update in every 10 minutes

const dnsupdate = () => {
    try {
        logger.debug("DNS update");

        const account = new Account();
        const pkeyhash = account.public_key_hash;
        const publickey = account.bs58pk;
        const domain = config.transport.host;
        const crypto_key = account.cryptokey;

        const payload = {
            domain: domain,
            pkeyhash: pkeyhash
        };

        const data = peermsg.create_jwt_token(crypto_key, Date.now(), payload, null, null, publickey);
        const message = JSON.stringify({data: data});

        HTTPTransport.write(message, { host: config.dns.host, port: config.dns.port, protocol: "http" }, "/setdns", (err, msg) => {
            try {
                if (err) {
                    return logger.error("dnsupdate HTTPTransport.write error: %j", err);
                }
                if (!msg) {
                    return logger.error("dnsupdate error: invalid response");
                }
                const resobj = JSON.parse(msg);
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

export const run = (callback) => {
    try {
        const conf = config.dns;
        if (!conf.run) {
            logger.info("DNS handler -> not running");
            return callback();
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
