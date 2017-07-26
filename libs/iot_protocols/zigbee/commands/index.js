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


class ZigbeeCommands {
    constructor() {
        this.txnmap = {
            0x0031: 0x77,
            0x0402: 0xc1
        };

    }

    static getTxn(clusterId) {
        return this.txnmap[clusterId];
    }

    getRoutingTable(address64, address16, timeout, index) {
        var txn = this.txnmap[0x0031]; // use 0x77 for the clusterID 0x0031, but it could be anything ...
        var cmd = {
            txid: txn,
            timeout: timeout || 5000,
            destination64: address64,
            destination16: address16, // 'fffe',
            clusterId: 0x0031,
            profileId: 0x0000,
            data: [txn, index]             
        };
        return cmd;
    }

    readTemperature(address64, address16, timeout ) {
        var txn = this.txnmap[0x0402]; 
        var cmd = {
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16, 
            sourceEndpoint: 0x00, 
            destinationEndpoint: 0x01, 
            clusterId: 0x0402,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x0]
        };
        return cmd;
    }

}

module.exports = ZigbeeCommands