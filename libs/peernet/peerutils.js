/*

This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines.

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Z Pardi
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


import http from 'http';
import { logger } from 'streembit-util';
import async from 'async';
import { Utils as stutils } from '../utils/index.js';



/*
    Discover the ipaddress of this node
    In order to communicate on the KAD network the ip or domain must be reachable by other nodes
*/
export const discovery = function (host, seeds, callback) {
    let result_ipaddress = 0;

    let isdomain = false;
    let isip = stutils.is_ipaddress(host);
    if (isip) {
        return callback(null, host);
    }

    let isdomain = stutils.is_valid_domain(host);
    if (isdomain) {
        return callback(null, host);
    }

    function discover_address(seed, asyncfn) {

        let options = {
            host: seed.host,
            path: '/',
            //since we are listening on a custom port, we need to specify it by hand
            port: seed.port,
            //This is what changes the request to a POST request
            method: 'POST'
        };

        let cbfn = function (response) {
            let result = ''
            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
                let reply = JSON.parse(result.toString());
                if (reply && reply.address) {
                    let ipv6prefix = "::ffff:";
                    if (reply.address.indexOf(ipv6prefix) > -1) {
                        reply.address = reply.address.replace(ipv6prefix, '');
                    }

                    if (stutils.is_ipaddress(reply.address)) {
                        result_ipaddress = reply.address;
                        asyncfn(null, true);
                    }
                    else {
                        asyncfn(null, false);
                    }
                }
                else {
                    logger.error("address discovery failed at " + seed.address + ":" + seed.port);
                    asyncfn(null, false);
                }
            });
        }

        let req = http.request(options, cbfn);

        req.on('error', function (err) {
            logger.error("address discovery failed at " + seed.host + ":" + seed.port + ". " + (err.message ? err.message : err));
            asyncfn(null, false);
        });

        let data = JSON.stringify({ type: 'DISCOVERY' });
        req.write(data);
        req.end();
    }



    async.detectSeries(
        seeds,
        discover_address,
        function (err, result) {
            if (result_ipaddress) {
                callback(null, result_ipaddress);
            }
            else {
                return callback("IP address discovery failed");
            }
        }
    );
}