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
Author: Tibor Zsolt Pardi
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var http = require("http");
var stutils = require("libs/utils");
var logger = require("libs/logger");

/*
    Discover the ipaddress of this node
    In order to communicate on the KAD network the ip or domain must be reachable by other nodes
*/
module.exports.discovery = function (host, seeds, callback) {
    var result_ipaddress = 0;

    var isdomain = false;
    var isip = stutils.is_ipaddress(host);
    if (isip) {
        return callback(null, host);
    }

    var isdomain = stutils.is_valid_domain(host);
    if (isdomain) {
        return callback(null, host);
    }
    
    function discover_address(seed, asyncfn) {

        //The url we want is `www.nodejitsu.com:1337/`
        var options = {
            host: seed.host,
            path: '/',
            //since we are listening on a custom port, we need to specify it by hand
            port: seed.port,
            //This is what changes the request to a POST request
            method: 'POST'
        };

        var cbfn  = function (response) {
            var result = ''
            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', function () {
                var reply = JSON.parse(result.toString());
                if (reply && reply.address) {
                    var ipv6prefix = "::ffff:";
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

        var req = http.request(options, cbfn);

        req.on('error', function (err) {
            logger.error("address discovery failed at " + seed.host + ":" + seed.port + ". " + (err.message ? err.message : err));
            asyncfn(null, false);
        });

        var data = JSON.stringify({ type: 'DISCOVERY' });
        req.write(data);
        req.end();        
    }

    var async = require("async");

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