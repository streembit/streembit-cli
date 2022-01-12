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
Author: Tibor Z Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';



import util from 'util';

const ZDO_TXN_NEIGHBORTABLE = 0x77;
const ZDO_TXN_TEMPERATURE = 0xc1;
const ZDO_TXN_POWERMULTIPLIER = 0xbb;
const ZDO_TXN_VOLTAGE = 0xbc;
const ZDO_TXN_POWER = 0xbe;
const ZDO_TXN_POWERDIVISOR = 0xbf;
const ZDO_TXN_SWITCHSTATUS = 0xab;
const ZDO_TXN_SWITCHOFF = 0xac;
const ZDO_TXN_SWITCHON = 0xad;
const ZDO_TXN_SWITCHTOGGLE = 0xae;
const ZDO_TXN_CONFIGUREREPORT = 0xdd;
const ZDO_TXN_HUMIDITY = 0xde;
const ZDO_TXN_READATTR = 0xdf;

let zigbeegateway = {};

export class ZigbeeCommands {
    constructor() {
    }

    static on_gateway_updated(payload) {
        zigbeegateway.address64 = payload.address64;
        zigbeegateway.address16 = payload.address16;
        zigbeegateway.endpoint = payload.endpoint;
    }

    static getTxn(clusterId) {
        return txnmap[clusterId];
    }

    static swapEUI64toLittleEndian(eui64) {
        if (!eui64 || eui64.length != 16) {
            throw new Error("Invalid EUI64 data. EUI64 must be an 16 charecter long string");
        }

        var buffer = Buffer.from(eui64, "hex");
        var final = Buffer.alloc(8);
        var index = 0;
        for (let i = buffer.length - 1; i >= 0; i--) {
            final[index++] = buffer[i];
        }

        return final;
    }

    static permitJoinRequest(address64, address16, duration) {
        const pjbuf = Buffer.alloc(2);
        pjbuf.writeUInt8(0x01, 0); // txn
        pjbuf.writeUInt8(duration, 1);
        //console.log("permit_join_req ClusterID=0x0036, duration: " + duration + ", buffer: " + util.inspect(pjbuf));
        var cmd = {
            destination64: address64,
            destination16: address16,
            clusterId: 0x0036,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: pjbuf
        };

        return cmd;
    }


    static mgmtLeaveRequesteq(address64, address16) {
        var addressbuf = ZigbeeCommands.swapEUI64toLittleEndian(address64);
        const narbuf = Buffer.alloc(10);
        narbuf.writeUInt8(0x05, 0); // txn
        addressbuf.copy(narbuf, 1);
        narbuf.writeUInt8(0x00, 9); // Reserved Remove Children Rejoin
        //console.log("mgmt_leave_reqt ClusterID=0x0034 buffer: " + util.inspect(narbuf));
        var cmd = {
            destination64: address64,
            destination16: address16,
            clusterId: 0x0034,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: narbuf
        };

        return cmd;
    }

    static netAddressRequest(address64) {
        var addressbuf = ZigbeeCommands.swapEUI64toLittleEndian(address64);
        const narbuf = Buffer.alloc(10);
        narbuf.writeUInt8(0x03, 0); // 0x03 transaction sequence number (arbitrarily chosen) 
        addressbuf.copy(narbuf, 1);
        narbuf.writeUInt8(0x00, 9); // Request Type 
        var cmd = {
            destination64: "000000000000ffff",
            destination16: "fffe",
            clusterId: 0x0000,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: narbuf
        };

        return cmd;
    }

    static active_endpoint_request(address64, address16) {
        let addressbuf = Buffer.from(address16, 'hex');
        addressbuf.swap16();
        let aerbuf = Buffer.alloc(3);
        aerbuf.writeUInt8(0x05, 0);
        addressbuf.copy(aerbuf, 1);
        console.log("Active Endpoint Request data: " + util.inspect(aerbuf));
        var cmd = {
            destination64: address64,
            destination16: address16,
            clusterId: 0x0005,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: aerbuf
        };

        return cmd;
    }

    static simple_descriptor_request(address64, address16, endpoint) {
        var addressbuf = Buffer.from(address16, 'hex');
        addressbuf.swap16();
        const sdrbuf = Buffer.alloc(4);
        sdrbuf.writeUInt8(0x04, 0);
        addressbuf.copy(sdrbuf, 1);
        sdrbuf.writeUInt8(endpoint, 3);
        //console.log("Simple Descriptor Request data: " + util.inspect(sdrbuf));
        var cmd = {
            destination64: address64,
            destination16: address16,
            clusterId: 0x0004,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: sdrbuf
        };

        return cmd;
    }

    static getNeighborTable(address64, address16, index) {
        var txn = ZDO_TXN_NEIGHBORTABLE; // use 0x77 for the clusterID 0x0031, but it could be anything ...
        var cmd = {
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

    static bind(txn, address64, address16, clusterid, deviceendpoint) {
        var source64 = ZigbeeCommands.swapEUI64toLittleEndian(address64);
        var srcendpoint = deviceendpoint;

        var destaddress16 = zigbeegateway.address16;
        if (!destaddress16) {
            throw new Error("invalid gateway NWK address");
        }

        var destendpoint = zigbeegateway.endpoint;
        if (destendpoint == null) {
            throw new Error("invalid gateway endpoint");
        }

        var gateway64 = zigbeegateway.address64;
        if (!gateway64) {
            throw new Error("invalid gateway IEEE address");
        }

        var dest64buf = ZigbeeCommands.swapEUI64toLittleEndian(gateway64);

        const bindingbuf = Buffer.alloc(22);
        // werite txn
        bindingbuf.writeUInt8(txn, 0);
        // write the source address 
        source64.copy(bindingbuf, 1);
        // write the source endpoint
        bindingbuf.writeUInt8(srcendpoint, 9); // 
        // write the cluster id
        bindingbuf.writeUInt16LE(clusterid, 10, 2);
        // write the DstAddrMode
        bindingbuf.writeUInt8(0x03, 12); // 0x01 = 16-bit group address for DstAddress and DstEndp not present; 0x03 64-bit extended address for DstAddress and DstEndp present
        // write the DstAddress
        dest64buf.copy(bindingbuf, 13);
        bindingbuf.writeUInt8(destendpoint, 21); // 

        var cmd = {
            destination64: address64,
            destination16: address16, // 'fffe',
            sourceEndpoint: 0x00,           // for ZDO must be 0
            destinationEndpoint: 0x00,      // for ZDO must be 0
            clusterId: 0x0021,
            profileId: 0x0000,
            data: bindingbuf
        };
        return cmd;
    }

    static writeCieAddress(txn, address64, address16) {
        const gateway64 = zigbeegateway.address64;
        if (!gateway64) {
            throw new Error("invalid gateway IEEE address");
        }

        const enrollbuf = Buffer.alloc(14);
        // werite txn
        enrollbuf.writeUInt8(txn, 0);
        enrollbuf.writeUInt8(0x02, 2); // write attribute
        enrollbuf.writeUInt16LE(0x0010, 3); // attribute identifier
        enrollbuf.writeUInt8(0xf0, 5); // 0xf0 data type
        // write the DstAddress
        const dest64buf = ZigbeeCommands.swapEUI64toLittleEndian(gateway64);
        dest64buf.copy(enrollbuf, 6);

        const cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: 0x00,           // ?????
            destinationEndpoint: 0x00,      // ?????
            clusterId: 0x0500,
            profileId: 0x0104,
            data: enrollbuf
        };

        return cmd;
    }

    static readTemperature(address64, address16, destendpoint) {
        var txn = ZDO_TXN_TEMPERATURE;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0402,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    static readHumidity(address64, address16, destendpoint) {
        var txn = ZDO_TXN_HUMIDITY;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0405,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    static readAlarm(address64, address16, destendpoint) {
        var txn = ZDO_TXN_HUMIDITY;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0405,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    static readAttributes(address64, address16, clusterId, attributes, destendpoint) {
        var txn = ZDO_TXN_READATTR;

        var data = [0x00, txn, 0x00];
        attributes.forEach(
            (attr) => {
                data.push(attr);
            }
        );

        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: clusterId,
            profileId: 0x0104,
            data: data
        };
        return cmd;
    }

    static readSwitchStatus(address64, address16, destendpoint) {
        var txn = ZDO_TXN_SWITCHSTATUS;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x00, 0x00]
        };
        return cmd;
    }

    static execToggleSwitch(address64, address16, destendpoint) {
        var txn = ZDO_TXN_SWITCHTOGGLE;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0006,
            profileId: 0x0104,
            data: [0x01, 0x01, 0x02]
        };
        return cmd;
    }

    static pollCheckIn(address64, address16, destendpoint) {
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0020,
            profileId: 0x0104,
            data: [0x01, 0x88, 0x01]
        };
        return cmd;
    }

    static readVoltage(address64, address16, destendpoint) {
        var txn = ZDO_TXN_VOLTAGE;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x05, 0x05]
        };
        return cmd;
    }


    static readPower(address64, address16, destendpoint) {
        var txn = ZDO_TXN_POWER;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x0b, 0x05]
        };
        return cmd;
    }

    static readPowerDivisor(address64, address16, destendpoint) {
        var txn = ZDO_TXN_POWERDIVISOR;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x05, 0x06]
        };
        return cmd;
    }


    static readPowerMultiplier(address64, address16, destendpoint) {
        var txn = ZDO_TXN_POWERMULTIPLIER;
        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: 0x0b04,
            profileId: 0x0104,
            data: [0x00, txn, 0x00, 0x04, 0x06]
        };
        return cmd;
    }

    static configureReport(address64, address16, cluster, reports, destendpoint) {
        var txn = ZDO_TXN_CONFIGUREREPORT;
        var len = 3; // frame control, txn and command -> 3 bytes
        var report_buffers = [];

        function add_report_item(report) {
            var attribute = report.attribute,
                datatype = report.datatype,
                mininterval = report.mininterval,
                maxinterval = report.maxinterval,
                reportable_change = report.reportable_change;

            var reportbuf = Buffer.alloc(8);
            reportbuf.writeUInt8(0x00, 0);              // direction 0x00
            reportbuf.writeUIntLE(attribute, 1, 2);     // attribute
            reportbuf.writeUInt8(datatype, 3);          // data type e.g 0x10 boolean
            reportbuf.writeUIntLE(mininterval, 4, 2);
            reportbuf.writeUIntLE(maxinterval, 6, 2);
            if (reportable_change) {
                if (datatype == 0x21 || datatype == 0x29) {
                    var newbuf = Buffer.alloc(10);
                    reportbuf.copy(newbuf);
                    newbuf.writeUInt16LE(reportable_change, 8, 2);
                    reportbuf = newbuf;
                }
            }
            len += reportbuf.length;
            report_buffers.push(reportbuf);
        }

        reports.forEach(
            (report) => {
                add_report_item(report);
            }
        );

        var reportbuf = Buffer.alloc(len);
        reportbuf.writeUInt8(0x00, 0);              // frame control
        reportbuf.writeUInt8(txn, 1);               // txn
        reportbuf.writeUInt8(0x06, 2);           // command 0x06 for Configure report   

        var offset = 3;
        for (let i = 0; i < report_buffers.length; i++) {
            let size = report_buffers[i].length
            report_buffers[i].copy(reportbuf, offset);
            offset += size;
        }

        console.log("configure reporting at " + address64 + ", cluster: " + cluster + ", destinationEndpoint: " + destendpoint + ", buffer: " + util.inspect(reportbuf));

        var cmd = {
            destination64: address64,
            destination16: address16,
            sourceEndpoint: zigbeegateway.endpoint,
            destinationEndpoint: destendpoint,
            clusterId: cluster,
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

