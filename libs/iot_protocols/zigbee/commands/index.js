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

const constants = require("libs/constants");

class ZigbeeCommands {
    constructor() {
        this.txnmap = {};
        this.txnmap[constants.IOT_CLUSTER_NEIGHBORTABLE] = 0x77;
        this.txnmap[constants.IOT_CLUSTER_TEMPERATURE] = 0xc1;
        this.txnmap[constants.IOT_CLUSTER_POWERMULTIPLIER] = 0xbb;
        this.txnmap[constants.IOT_CLUSTER_VOLTAGE] = 0xbc;
        this.txnmap[constants.IOT_CLUSTER_POWER] = 0xbe;
        this.txnmap[constants.IOT_CLUSTER_POWERDIVISOR] = 0xbf;
        this.txnmap[constants.IOT_CLUSTER_SWITCHSTATUS] = 0xab;
        this.txnmap[constants.IOT_CLUSTER_SWITCHOFF] = 0xac;
        this.txnmap[constants.IOT_CLUSTER_SWITCHON] = 0xad;
        this.txnmap[constants.IOT_CLUSTER_SWITCHTOGGLE] = 0xae;
    }

    static getTxn(clusterId) {
        return this.txnmap[clusterId];
    }

    getNeighborTable(address64, address16, timeout, index) {
        var txn = this.txnmap[constants.IOT_CLUSTER_NEIGHBORTABLE]; // use 0x77 for the clusterID 0x0031, but it could be anything ...
        var cmd = {
            taskid: constants.IOT_CLUSTER_NEIGHBORTABLE,
            txid: txn,
            timeout: timeout || 5000,
            destination64: address64,
            destination16: address16, // 'fffe',
            sourceEndpoint: 0x00,           // for ZDO must be 0
            destinationEndpoint: 0x00,      // for ZDO must be 0
            clusterId: 0x0031,
            profileId: 0x0000,
            data: [txn, index]             
        };
        return cmd;
    }

    readTemperature(address64, address16, timeout ) {
        var txn = this.txnmap[constants.IOT_CLUSTER_TEMPERATURE]; 
        var cmd = {
            taskid: constants.IOT_CLUSTER_TEMPERATURE,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16, 
            sourceEndpoint: 0x00, 
            destinationEndpoint: 0x01, 
            clusterId: 0x0402,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    readSwitchStatus(address64, address16, timeout) {
        var txn = this.txnmap[constants.IOT_CLUSTER_SWITCHSTATUS];
        var cmd = {
            taskid: constants.IOT_CLUSTER_SWITCHSTATUS,
            txid: txn,
            timeout: timeout || 5000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x01,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    execToggleSwitch(address64, address16) {
        var txn = this.txnmap[constants.IOT_CLUSTER_SWITCHTOGGLE];
        var cmd = {
            taskid: constants.IOT_CLUSTER_SWITCHTOGGLE,
            txid: txn,
            timeout: 0,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x01,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: [0x01, 0x01, 0x02]
        };
        return cmd;
    }

    readVoltage(address64, address16, timeout) {
        var txn = this.txnmap[constants.IOT_CLUSTER_VOLTAGE];
        var cmd = {
            taskid: constants.IOT_CLUSTER_VOLTAGE,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x05, 0x05]
        };
        return cmd;
    }

    readPower(address64, address16, timeout) {
        var txn = this.txnmap[constants.IOT_CLUSTER_POWER];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POWER,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x0b, 0x05]
        };
        return cmd;
    }

    readPowerDivisor(address64, address16, timeout) {
        var txn = this.txnmap[constants.IOT_CLUSTER_POWERDIVISOR];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POWERDIVISOR,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x05, 0x06]
        };
        return cmd;
    }

    readPowerMultiplier(address64, address16, timeout) {
        var txn = this.txnmap[constants.IOT_CLUSTER_POWERMULTIPLIER];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POWERMULTIPLIER,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x04, 0x06]
        };
        return cmd;
    }

}

module.exports = ZigbeeCommands