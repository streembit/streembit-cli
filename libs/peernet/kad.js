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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const config = require("libs/config");
const logger = require("libs/logger");
const db = require("libs/database");
const kad = require('libs/kad');
const Account = require("libs/account");
const utils = require("libs/utils");

class KadHandler {
    constructor() {
        this.m_node = 0;
    }

    get node(){
        return this.m_node;
    }

    set node(n) {
        this.m_node = n;
    }

    init(callback) {
        var transport = new kad.UDPTransport();
        var account = new Account();
        var bs58pk = account.bs58pk;
        var contact = { hostname: config.ipaddress, port: config.port, pubkey: bs58pk};
        var storage = db.streembitdb;
        var kadnode = kad({ transport: transport, storage: storage, logger: logger, contact: contact });
        this.node = kadnode;

        var host = utils.is_ipaddress(config.ipaddress) ? config.ipaddress : null;
        this.node.listen(config.port, host);

        callback();
    }

}

module.exports.KadHandler = KadHandler;


