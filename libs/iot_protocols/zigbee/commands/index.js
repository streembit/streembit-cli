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
        this.txnmap[constants.IOT_CLUSTER_POLLCHECKIN] = 0x76;
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
        this.txnmap[constants.IOT_CLUSTER_CONFIGUREREPORT] = 0xdd;        
    }

    static getTxn(clusterId) {
        return this.txnmap[clusterId];
    }

    getNeighborTable(device_details, timeout, index) {
        var address64 = device_details.address64, address16 = device_details.address16;    
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

    readTemperature(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_TEMPERATURE]; 
        var cmd = {
            taskid: constants.IOT_CLUSTER_TEMPERATURE,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16, 
            sourceEndpoint: device_details.endpoint, 
            destinationEndpoint: 0x01, 
            clusterId: 0x0402,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    //readSwitchStatus(address64, address16, timeout) {
    readSwitchStatus(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_SWITCHSTATUS];
        var cmd = {
            taskid: constants.IOT_CLUSTER_SWITCHSTATUS,
            txid: txn,
            timeout: timeout || 5000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    execToggleSwitch(device_details, address16) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_SWITCHTOGGLE];
        var cmd = {
            taskid: constants.IOT_CLUSTER_SWITCHTOGGLE,
            txid: txn,
            timeout: 0,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: [0x01, 0x01, 0x02]
        };
        return cmd;
    }

    pollCheckIn(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;
        var txn = this.txnmap[constants.IOT_CLUSTER_POLLCHECKIN];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POLLCHECKIN,
            txid: txn,
            timeout: timeout || 5000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0020,
            profileId: 0x0104,
            //data: [0x00, 0x88, 0x00] // send 0x88 as txn number 
            data: [0x01, 0x88, 0x01] 
        };
        return cmd;
    }

    //readVoltage(address64, address16, timeout) {
    readVoltage(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_VOLTAGE];
        var cmd = {
            taskid: constants.IOT_CLUSTER_VOLTAGE,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x05, 0x05]
        };
        return cmd;
    }

    //readPower(address64, address16, timeout) {
    readPower(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_POWER];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POWER,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x0b, 0x05]
        };
        return cmd;
    }

    //readPowerDivisor(address64, address16, timeout) {
    readPowerDivisor(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_POWERDIVISOR];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POWERDIVISOR,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x05, 0x06]
        };
        return cmd;
    }

    //readPowerMultiplier(address64, address16, timeout) {
    readPowerMultiplier(device_details, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_POWERMULTIPLIER];
        var cmd = {
            taskid: constants.IOT_CLUSTER_POWERMULTIPLIER,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x04, 0x06]
        };
        return cmd;
    }

    configureReport(device_details, attribute, datatype, mintime1, mintime2, maxtime1, maxtime2, reportable_change, timeout) {
        var address64 = device_details.address64, address16 = device_details.address16;    
        var txn = this.txnmap[constants.IOT_CLUSTER_CONFIGUREREPORT];

        var command = 0x06;

        var reportbuf = Buffer.alloc(11);
        reportbuf.writeUInt8(0x00, 0);              // frame control
        reportbuf.writeUInt8(txn, 1);               // txn
        reportbuf.writeUInt8(command, 2);           // command 0x06 for Configure report   
        reportbuf.writeUInt8(0x00, 3);              // direction 0x00
        reportbuf.writeUIntLE(attribute, 4, 2);     // attribute
        reportbuf.writeUInt8(datatype, 6);          // data type e.g 0x10 boolean
        reportbuf.writeUIntLE(mininterval, 7, 2);
        reportbuf.writeUIntLE(maxinterval, 9, 2);
        if (reportable_change) {
            if (datatype == 0x21 || datatype == 0x29) {
                var newbuf = Buffer.alloc(13);
                reportbuf.copy(newbuf);
                newbuf.writeUInt16LE(reportable_change, 11, 2);
                reportbuf = newbuf;
            }
        }
        console.log("configure reporting at " + address64 + " buffer: " + util.inspect(reportbuf));

        var cmd = {
            taskid: constants.IOT_CLUSTER_CONFIGUREREPORT,
            txid: txn,
            timeout: timeout || 10000,
            destination64: address64,
            destination16: address16,
            sourceEndpoint: device_details.endpoint,
            destinationEndpoint: 0x01,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: reportbuf
        };

        /*

        Devices shall support the reporting
        configuration mechanisms for all reportable attributes. The minimum reporting
        interval specified in [B2] shall be set to a value greater than or equal to 0x0001.
        The maximum reporting interval should be set to 0x0000 by default, and if it is set
        to a non-zero value it shall be set to a value greater than or equal to 0x003C and
        greater than the value of the minimum reporting interval. These settings will
        restrict the attributes from being reported more often than once every second if the
        attribute is changing quickly and at least once every minute if the attribute does
        not change for a long time. It is recommended that the minimum reporting interval
        be set to a higher value whenever the application can tolerate it. It is
        recommended that the maximum reporting interval be set to a much greater value
        to avoid unnecessary traffic.

        0x00: Frame Control Field
        The frame control field is 8-bits in length and contains information defining the
        command type and other control flags. The frame control field shall be formatted
        as shown in Figure 2.3. Bits 5-7 are reserved for future use and shall be set to 0.
        ... it seems 0x00 is correct

        0xdd: Transaction Sequence Number
        The transaction sequence number field is 8-bits in length and specifies an
        identification number for the transaction so that a response-style command frame
        can be related to a request-style command frame. The application object itself
        shall maintain an 8-bit counter that is copied into this field and incremented by
        one for each command sent. When a value of 0xff is reached, the next command
        shall re-start the counter with a value of 0x00.
        The transaction sequence number field can be used by a controlling device, which
        may have issued multiple commands, so that it can match the incoming responses
        to the relevant command.

        0x06:Command identifier
        Configure reporting -> 0x06, Table 2.9 ZCL Command Frames

        0x00: Direction field
        If this value is set to 0x00, then the attribute data type field, the minimum
        reporting interval field, the maximum reporting interval field and the reportable
        change field are included in the payload, and the timeout period field is omitted.
        The record is sent to a cluster server (or client) to configure how it sends reports to
        a client (or server) of the same cluster;

        0x0000: Attribute Identifier Field
        Table 3.38 Attributes of the On/Off Server Cluster
        Identifier  Name    Type        Range           Access      Default     Mandatory
        0x0000      OnOff   Boolean     0x00 – 0x01     Read only   0x00        M

        0x10: Attribute Data Type Field
        The Attribute data type field contains the data type of the attribute that is to be reported.
        0x10 for boolean

        0x00, 0x00: Minimum Reporting Interval Field
        The minimum reporting interval field is 16-bits in length and shall contain the
        minimum interval, in seconds, between issuing reports of the specified attribute.
        If this value is set to 0x0000, then there is no minimum limit, unless one is
        imposed by the specification of the cluster using this reporting mechanism or by
        the applicable profile.

        0x00, 0x20: Maximum Reporting Interval Field
        The maximum reporting interval field is 16-bits in length and shall contain the
        maximum interval, in seconds, between issuing reports of the specified attribute.
        If this value is set to 0xffff, then the device shall not issue reports for the specified
        attribute, and the configuration information for that attribute need not be
        maintained. (Note:- in an implementation using dynamic memory allocation, the
        memory space for that information may then be reclaimed).

        Next is not exists as for boolean which is a "Discrete" data type it is emitted:
        The reportable change field shall contain the minimum change to the attribute that
        will result in a report being issued. This field is of variable length. For attributes
        with 'analog' data type (see Table 2.15) the field has the same data type as the
        attribute. The sign (if any) of the reportable change field is ignored.
        For attributes of 'discrete' data type (see Table 2.15) this field is omitted.

        0x00,0x00: Timeout Period Field
        The timeout period field is 16-bits in length and shall contain the maximum
        expected time, in seconds, between received reports for the attribute specified in
        the attribute identifier field. If more time than this elapses between reports, this
        may be an indication that there is a problem with reporting.
        If this value is set to 0x0000, reports of the attribute are not subject to timeout.        

        */


        return cmd;
    }

}

module.exports = ZigbeeCommands