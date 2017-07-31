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

const xbeeapi = require('./xbeeapi');
const util = require('util');
const SerialPort = require('serialport');
const logger = require('libs/logger');
const config = require('libs/config');
const events = require("libs/events");
const constants = require("libs/constants");
const iotdefinitions = require("libs/iot/definitions");
const BufferReader = require('buffer-reader');
const BitStream = require('libs/utils/bitbuffer').BitStream;
const sprintf = require('sprintf-js').sprintf;

const MYENDPOINT = 0x02; // TODO review this to set it dynamcally

let C = xbeeapi.constants;

let xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

let serialport = 0;
let pending_tasks = [];
let devices = {};
let neighbortable = [];

class XbeeHandler {

    constructor() {
        this.is_portopened = false;
        this.gateway = 0;
        this.init_xbee_framehandler();
    }

    dispatch_datarcv_event(address64, payload) {
        try {
            if (!address64) {
                throw new Error("dispatch_datarcv_event() invalid address64");
            }
            
            var eventname = address64 + iotdefinitions.DATA_RECEIVED_EVENT;
            events.emit(eventname, payload);            
        }
        catch (err) {
            logger.error("dispatch_datarcv_event error: %j", err)
        }
    }

    add_pending_task(task) {
        pending_tasks.push(task);
    }

    delete_pending_task(taskid, address64) {
        for (var i = 0; i < pending_tasks.length; i++) {
            if (pending_tasks[i].address64 == address64 && pending_tasks[i].taskid == taskid) {
                pending_tasks.splice(i, 1);
                //console.log("removing pending task " + taskid + " " + address64);
                break;
            }
        }
    }

    get_pending_task(taskid, address64) {
        var callback = 0;
        for (var i = 0; i < pending_tasks.length; i++) {
            if (pending_tasks[i].address64 == address64 && pending_tasks[i].taskid == taskid) {
                callback = pending_tasks[i].fn;
                // clear the timer
                if (pending_tasks[i].timer) {
                    clearTimeout(pending_tasks[i].timer);
                }
                pending_tasks.splice(i, 1);
                break;
            }
        }
        return callback;
    }

    // Command helpers for ZDO & ZCL

    find_neighbor_table(address64, index) {
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            destination64: address64,
            destination16: 'fffe',
            clusterId: 0x0031,
            profileId: 0x0000,
            data: [0x77, index] // we use 0x77 for TXN number for the 0031 cluster
        };

        serialport.write(xbee.buildFrame(txframe));
    }

    get_routing_table() {
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            clusterId: 0x0032,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: [0x01, 0x00]
        };

        serialport.write(xbee.buildFrame(txframe));
    }

    simple_descriptor_request(address64, address16, data) {
        console.log("simple_descriptor_request to " + address64);
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            destination64: address64,
            destination16: address16,
            clusterId: 0x0004,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: data
        };

        serialport.write(xbee.buildFrame(txframe));
    }

    active_endpoint_request(address64, address16, data) {
        console.log("active_endpoint_request to " + address64);
        var txframe = { 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            destination64: address64,
            destination16: address16,
            clusterId: 0x0005,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: data
        };

        serialport.write(xbee.buildFrame(txframe));
    }

    match_descriptor_response(address64, address16, data) {
        //console.log("match_descriptor_response to " + address64);
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            destination64: address64,
            destination16: address16,
            clusterId: 0x8006,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: data
        };

        serialport.write(xbee.buildFrame(txframe));
    }

    simple_basciccluster_request(address64, address16, destenpoint, data) {
        //console.log("simple_basciccluster_request to " + address64);
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            destination64: address64,
            destination16: address16,
            clusterId: 0x0000,
            profileId: 0x0104,
            sourceEndpoint: MYENDPOINT,
            destinationEndpoint: destenpoint,
            data: data
        };

        serialport.write(xbee.buildFrame(txframe));
    }

    // end Command helpers mainly for ZDO & ZCL

    handle_cluster_routingtable(frame) {
        //debugger;
        //console.log("handle_cluster_descriptor");
        if (!frame.remote64 || typeof frame.remote64 != 'string') {
            return logger.error("Invalid remote64 data for cluster 8032 response");
        }

        // console.log("8032 response " + util.inspect(frame));

        // clear the routetable so it will be populated with clusterID 0x31
        neighbortable = [];


        if (frame.remote64.toLowerCase() == this.gateway) {
            this.dispatch_datarcv_event(
                frame.remote64,
                {
                    "type": iotdefinitions.EVENT_DEVICE_ACTIVATED,
                    "devicedetails": [
                        {
                            "name": "address64",
                            "value": frame.remote64,
                        },
                        {
                            "name": "address16",
                            "value": frame.remote16
                        }
                    ]
                }
            );
        }
        else {
            // send an Active Endpoint Request 0x0005 to the end device
            var addressbuf = Buffer.from(frame.remote16, 'hex');
            addressbuf.swap16();
            const aerbuf = Buffer.alloc(3);
            aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
            addressbuf.copy(aerbuf, 1);
            var aerdata = [...aerbuf];
            //console.log("Active Endpoint Request data: " + util.inspect(aerdata));
            this.active_endpoint_request(frame.remote64, frame.remote16, aerdata);
        }

        //
    }

    handle_cluster_neighbortable (frame) {
        try {
            //console.log("handle_cluster_neighbortable");
            //console.log(util.inspect(frame));
            var clusterId = 0x0031;

            var bufflen = frame.data.length;
            var reader = new BufferReader(frame.data);
            var id = reader.nextUInt8();
            var status = reader.nextUInt8();
            var devices_length = reader.nextUInt8();
            var startindex = reader.nextUInt8();
            var count = reader.nextUInt8();
            //console.log("buffer length: %d, status: %d, devices length: %d, startindex: %d, count: %d", bufflen, status, devices_length, startindex, count);

            if (count <= 0) {
                return;
            }

            var parsed = 0;
            while (parsed < count) {

                var device = {};

                var panidbuf = reader.nextBuffer(8);
                panidbuf.swap64();
                var panid = panidbuf.toString("hex");
                //console.log("panidbuf: %s", panid);
                var addressbuf = reader.nextBuffer(8);
                addressbuf.swap64();
                var address = addressbuf.toString("hex");
                //console.log("address: %s", address);
                var shortaddrbuf = reader.nextBuffer(2);
                shortaddrbuf.swap16();
                var address16 = shortaddrbuf.toString("hex");
                //console.log("address16: %s", address16);

                var devinfobuf = reader.nextBuffer(1);
                var devinfobits = new BitStream(devinfobuf);
                var device_type = devinfobits.readBits(2);
                //console.log("device_type: %s", device_type);
                var iddle_enable = devinfobits.readBits(2);
                //console.log("iddle_enable: %s", iddle_enable);
                device.iddle_enable = iddle_enable;

                //Indicates if the neighbor’s receiver is enabled during idle times.
                //0x0 – Receiver is off
                //0x1 – Receiver is on
                //0x02 – Unknown


                var relationship = devinfobits.readBits(3);
                //console.log("relationship: %s", relationship);
                device.relationship = relationship;

                //The relationship of the neighbor with the remote device:
                //0x0 – Neighbor is the parent
                //0x1 – Neighbor is a child
                //0x2 – Neighbor is a sibling
                //0x3 – None of the above
                //0x4 – Previous child


                var permitbuf = reader.nextBuffer(1);
                var permitbits = new BitStream(permitbuf);
                var permitjoin = permitbits.readBits(2);
                device.permitjoin = permitjoin;
                //console.log("permitjoin: %s", permitjoin);

                //Indicates if the neighbor is accepting join requests.
                //0x0 – Neighbor not accepting joins
                //0x1 – Neighbor is accepting joins
                //0x2 – Unknown


                var depth = reader.nextUInt8();
                var lqi = reader.nextUInt8();
                device.depth = depth;
                device.lqi = lqi;
                //console.log("depth: %d, lqi: %d", depth, lqi);
                var address64 = address.toLowerCase();
                device.address64 = address64;
                device.address16 = address16;

                neighbortable.push(device);

                parsed++;
            };

            var txid = frame.data[0];
            var callback = this.get_pending_task(constants.IOT_CLUSTER_NEIGHBORTABLE, frame.remote64);
            if (callback) {
                callback(null, frame.remote64, frame.remote16, startindex, count, devices_length, neighbortable);
            }

        }
        catch (err) {
            logger.error("handle_cluster_neighbortable error: %j", err);
        }
    };

    handle_cluster_simpledesciptor_response(frame) {
        var reader = new BufferReader(frame.data);
        var id = reader.nextUInt8();
        var status = reader.nextUInt8();
        if (status != 0) {
            return logger.error("Simple Descriptor Request status: error for device " + frame.remote64);
        }

        reader.seek(11);
        var count = reader.nextUInt8();
        console.log("count of clusters: " + count);
        var clusters = [];
        for (var i = 0; i < count; i++) {
            var cluster = reader.nextUInt16LE();
            var txtcluster = sprintf("%04x", cluster);
            clusters.push(txtcluster);
        }

        logger.debug(frame.remote64 + " clusters: " + util.inspect(clusters));

        // store the cluster list of the device
        devices[frame.remote64].clusters = clusters;

        this.dispatch_datarcv_event(
            frame.remote64,
            {
                "type": iotdefinitions.EVENT_DEVICE_ACTIVATED,
                "devicedetails": [
                    {
                        "name": "address64",
                        "value": frame.remote64,
                    },
                    {
                        "name": "address16",
                        "value": frame.remote16
                    }
                ]
            }
        );

        // get the manufacturer & device info 
        setTimeout(
            () => {
                console.log("query device info, hardware version");
                var endpoint = devices[frame.remote64].endpoints[0];
                var txn = 0x99;
                var bcrdata = [0x00, txn, 0x00, 0x03, 0x00]
                this.simple_basciccluster_request(frame.remote64, frame.remote16, endpoint, bcrdata);
            },
            2000
        );

        setTimeout(
            () => {
                console.log("query device info, manufacturer");
                var endpoint = devices[frame.remote64].endpoints[0];
                var txn = 0x99;
                var bcrdata = [0x00, txn, 0x00, 0x04, 0x00]
                this.simple_basciccluster_request(frame.remote64, frame.remote16, endpoint, bcrdata);
            },
            2500
        );

        setTimeout(
            () => {
                console.log("query device info, model number");
                var endpoint = devices[frame.remote64].endpoints[0];
                var txn = 0x99;
                var bcrdata = [0x00, txn, 0x00, 0x05, 0x00]
                this.simple_basciccluster_request(frame.remote64, frame.remote16, endpoint, bcrdata);
            },
            3000
        );
    }

    handle_cluster_activeendpoint_response(frame) {
        if (frame.profileId != "0000") {
            return logger.debug("INVALID profileID for clusterId 0x8005")
        }

        if (!devices[frame.remote64]) {
            devices[frame.remote64] = { address16: frame.remote16,  endpoints: 0, clusters: 0 };
        }

        var reader = new BufferReader(frame.data);
        var id = reader.nextUInt8();
        var status = reader.nextUInt8();

        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        var destaddress = valuebuf.readUInt16BE(0);

        //console.log("id: %s, status: %d, address16: %s", id.toString(16), status, destaddress.toString(16));

        // Number of endpoints in the following endpoint list
        var number_of_endpoints = reader.nextUInt8();
        //console.log("number_of_endpoints: %d", number_of_endpoints);
        var endpoints = [];
        for (var i = 0; i < number_of_endpoints; i++) {
            var endpoint = reader.nextUInt8();
            endpoints.push(endpoint);
        }
        //console.log("endpoints: " + util.inspect(endpoints));

        if (endpoints.length) {
            devices[frame.remote64].endpoints = endpoints;
        }
        console.log(frame.remote64 + " ednpoints: " + util.inspect(devices[frame.remote64]));

        // reply with 0004 Simple Descriptor Request
        var addressbuf = Buffer.from(frame.remote16, 'hex');
        addressbuf.swap16();
        const sdrbuf = Buffer.alloc(4);
        sdrbuf.writeUInt8(0x15, 0); // 0x15 transaction sequence number (arbitrarily chosen)                        
        addressbuf.copy(sdrbuf, 1);
        // send to the first endpoint
        var endp = endpoints[0];
        sdrbuf.writeUInt8(endp, 3);
        var sdrdata = [...sdrbuf];
        //console.log("Simple Descriptor Request data: " + util.inspect(sdrdata));
        this.simple_descriptor_request(frame.remote64, frame.remote16, sdrdata);       
        
        //
    }

    //
    //   clusterID 0x0006 is for both ZDO Match Descriptor Request and HA profile switch so the name is mdrhaswitch
    //
    handle_cluster_mdrhaswitch(frame) {
        try {
            if (!frame.profileId) {
                return;
            }

            if (frame.profileId == "0000") {
                // handle ZDO 0x0006 Match Descriptor Request
                logger.debug("Match Descriptor Request from " + frame.remote64);

                // create the device
                if (!devices[frame.remote64]) {
                    devices[frame.remote64] = { address16: frame.remote16, endpoints: 0, clusters: 0 };
                }

                var reader = new BufferReader(frame.data);
                var id = reader.nextUInt8();

                var valuebuf = reader.nextBuffer(2);
                valuebuf.swap16();
                var destaddress = valuebuf.readUInt16BE(0);

                //console.log("Match Descriptor Request id: %s, dest: %s", id.toString(16), destaddress.toString(16));

                valuebuf = reader.nextBuffer(2);
                valuebuf.swap16();
                var requested_profile = valuebuf.readUInt16BE(0);
                //console.log("requested profile: %s", requested_profile.toString(16));

                var number_of_input_clusters = reader.nextUInt8();
                //console.log("number_of_input_clusters: %d", number_of_input_clusters);

                // reply with 8006
                const respbuf = Buffer.alloc(6);
                respbuf.writeUInt8(0x11, 0); // transaction sequence number (arbitrarily chosen)
                respbuf.writeUInt8(0x00, 1); // status
                respbuf.writeUInt16LE(0x0000, 2); // Indicates the 16-bit address of the responding device, this is the coordinator with address 0x0000
                respbuf.writeUInt8(0x01, 4); // 1 endpoint
                respbuf.writeUInt8(MYENDPOINT, 5); // set endpoint tp 0x02
                var response = [...respbuf];
                ////console.log("match descriptor response data: " + util.inspect(response));
                this.match_descriptor_response(frame.remote64, frame.remote16, response);

                //var device_connecting_event = frame.remote64 + iotdefinitions.DEVICE_CONTACTING;
                //events.emit(
                //    device_connecting_event,
                //    {
                //        address64: frame.remote64,
                //        address16: frame.remote16
                //    }
                //);       

                //debugger;

                this.dispatch_datarcv_event(
                    frame.remote64,
                    {
                        "type": iotdefinitions.EVENT_DEVICE_CONTACTING,
                        "devicedetails": [
                            {
                                "name": "address64",
                                "value": frame.remote64,
                            },
                            {
                                "name": "address16",
                                "value": frame.remote16
                            }                 
                        ]
                    }
                );


                if (devices[frame.remote64] && devices[frame.remote64].endpoints && devices[frame.remote64].endpoints.length) {
                    //console.log("- - - - active endpoint is known for device " + frame.remote64 + " endpoints: " + util.inspect(devices[frame.remote64].endpoints))
                    return;
                }

                // send Active Endpoint Request 0x0005
                var addressbuf = Buffer.from(frame.remote16, 'hex');
                addressbuf.swap16();
                const aerbuf = Buffer.alloc(3);
                aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
                addressbuf.copy(aerbuf, 1);
                var aerdata = [...aerbuf];
                //console.log("Active Endpoint Request data: " + util.inspect(aerdata));
                this.active_endpoint_request(frame.remote64, frame.remote16, aerdata);

                //
            }
            else if (frame.profileId == "0104") {
                // handle HA profile 0104
                //debugger;
                //console.log(util.inspect(frame));
                if (!frame.data) {
                    return;
                }

                var callback = this.get_pending_task(constants.IOT_CLUSTER_SWITCHSTATUS, frame.remote64);
                if (!callback) {
                    callback = function () { };
                }

                var reader = new BufferReader(frame.data);
                reader.seek(1);
                var txid = reader.nextUInt8();
                if (txid == 0xab) { // we use 0xab for the switch status attribute query, though it could be anything 
                    reader.seek(5);
                    var status = reader.nextUInt8();
                    if (status != 0) {
                        return callback("invalid status returned for ON/OFF switch status");
                    }
                    var datatype = reader.nextUInt8();
                    if (datatype != 0x10) { // must be boolean 0x10
                        return callback("invalid data type returned");
                    }

                    var value = reader.nextUInt8();
                    callback(null, value);

                    this.dispatch_datarcv_event(
                        frame.remote64,
                        {
                            "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                            "properties": [
                                {
                                    "property": iotdefinitions.PROPERTY_SWITCH_STATUS,
                                    "value": value
                                }
                            ]
                        }
                    );

                    //
                }
                else if (txid == 0xdd) {  // configure report response
                    console.log(util.inspect(frame));
                }
            }

            //
        }
        catch (err) {
            logger.error("handle_cluster_mdrhaswitch error: %j", err);
        }
    }

    handle_cluster_electricmeasure (frame) {

        var reader = new BufferReader(frame.data);
        reader.seek(1);

        var txid = reader.nextUInt8();

        var callback = 0;
        if (txid == 0xbe) {
            callback = this.get_pending_task(constants.IOT_CLUSTER_POWER, frame.remote64);
        }
        else if (txid == 0xbc) {
            callback = this.get_pending_task(constants.IOT_CLUSTER_VOLTAGE, frame.remote64);
        }
        else if (txid == 0xbf) {
            callback = this.get_pending_task(constants.IOT_CLUSTER_POWERDIVISOR, frame.remote64);
        }
        else if (txid == 0xbb) {
            callback = this.get_pending_task(constants.IOT_CLUSTER_POWERMULTIPLIER, frame.remote64);
        }

        if (!callback) {
            callback = function () { };
        }

        reader.seek(5);

        var status = reader.nextUInt8();
        if (status != 0) {
            return callback("invalid status returned");
        }

        var value = 0;
        var datatype = reader.nextUInt8();
        if (txid == 0xbc) {
            if (datatype != 0x21) {
                return callback("invalid data type returned");
            }
            var valuebuf = reader.nextBuffer(2);
            valuebuf.swap16();
            value = valuebuf.readUInt16BE(0);
        }
        else if (txid == 0xbe) {
            if (datatype != 0x29) {
                return callback("invalid data type returned");
            }
            var valuebuf = reader.nextBuffer(2);
            valuebuf.swap16();
            value = valuebuf.readInt16BE(0);
        }
        else if (txid == 0xbf) {
            if (datatype != 0x21) {
                return callback("invalid data type returned");
            }
            var valuebuf = reader.nextBuffer(2);
            valuebuf.swap16();
            value = valuebuf.readUInt16BE(0);
        }
        else if (txid == 0xbb) {
            if (datatype != 0x21) {
                return callback("invalid data type returned");
            }
            var valuebuf = reader.nextBuffer(2);
            valuebuf.swap16();
            value = valuebuf.readUInt16BE(0);
        }

        callback(null, value);

        //
    }

    handle_cluster_temperature (frame) {
        //debugger;
        //console.log("handle_cluster_temperature");
        //console.log(util.inspect(frame));

        var callback = this.get_pending_task(constants.IOT_CLUSTER_TEMPERATURE, frame.remote64);
        if (!callback) {
            callback = function () { };
        }

        var reader = new BufferReader(frame.data);
        reader.seek(1);
        var txid = reader.nextUInt8();
        reader.seek(5);
        var status = reader.nextUInt8();
        //console.log("status: %d", status);
        if (status != 0) {
            return callback("invalid status returned");
        }

        var datatype = reader.nextUInt8();
        //console.log("datatype: %d", datatype);
        if (datatype != 0x29) {
            return callback("invalid data type returned");
        }

        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        var tempvalue = valuebuf.readUInt16BE(0);
        var value = tempvalue * 0.01;
        console.log("temperature: %f Celsius", value);

        //debugger;

        callback(null, value);

        this.dispatch_datarcv_event(
            frame.remote64,
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "properties": [
                    {
                        "property": iotdefinitions.PROPERTY_TEMPERATURE,
                        "value": value
                    }
                ]
            }
        );        

        //
    }


    handle_cluster_deviceannounce(frame) {
        //console.log(util.inspect(frame));

        // reply with 0x0005 Active Endpoint Request
        var addressbuf = Buffer.from(frame.remote16, 'hex');
        addressbuf.swap16();
        const aerbuf = Buffer.alloc(3);
        aerbuf.writeUInt8(0x12, 0); // transaction sequence number (arbitrarily chosen)                        
        addressbuf.copy(aerbuf, 1);
        var aerdata = [...aerbuf];
        console.log("handle_cluster_deviceannounce() Active Endpoint Request data: " + util.inspect(aerdata));
        this.active_endpoint_request(frame.remote64, frame.remote16, aerdata);
    }

    handle_cluster_basic(frame) {
        try {
            //console.log(util.inspect(frame));

            var reader = new BufferReader(frame.data);
            reader.seek(1);
            var id = reader.nextUInt8();
            var command = reader.nextUInt8();
            //console.log("id: %s command %d", id.toString(16), command);
            if (id != 0x99 || command != 0x01) {
                logger.error("handle_cluster_basic() invalid id or command");
                return;
            }

            var attr1a = reader.nextUInt8();
            var attr1b = reader.nextUInt8();
            var attr1c = reader.nextUInt8();
            if (attr1b != 0x00) {
                logger.error("handle_cluster_basic() invalid data attribute");
                return;
            }

            if (attr1c != 0x00) {
                logger.error("handle_cluster_basic() invalid status");
                return;
            }

            if (attr1a == 0x03) {
                var datatype = reader.nextUInt8();
                if (datatype != 0x20) {
                    logger.error("handle_cluster_basic() data type for 0003 is NOT UInt8(0x20)");
                    return;
                }

                var hardware_version = reader.nextUInt8();
                logger.debug("hardware_version: %d", hardware_version);
                // 0x0003 HWVersion
                this.dispatch_datarcv_event(
                    frame.remote64,
                    {
                        "type": iotdefinitions.EVENT_DEVICE_PROPERTY_UPDATE,
                        "properties": [
                            {
                                "property": iotdefinitions.PROPERTY_HWVERSION,
                                "value": hardware_version
                            }
                        ]
                    }
                );

                //events.emit(
                //    events.TYPES.ONIOTEVENT,
                //    constants.IOTPROPERTY_UPDATE,
                //    {
                //        id: frame.remote64,
                //        property: {
                //            name: "hwversion",
                //            value: hardware_version
                //        }
                //    }
                //);       
            }
            else if (attr1a == 0x04) {
                var datatype = reader.nextUInt8();
                if (datatype != 0x42) {
                    logger.error("handle_cluster_basic() data type for 0004 is NOT string (0x42)");
                    return;
                }

                reader.nextUInt8();
                var strbuffer = reader.restAll();
                var manufacturer = strbuffer.toString('utf8');
                logger.debug("manufacturer: %s", manufacturer);
                // 0x0004 ManufacturerName
                this.dispatch_datarcv_event(
                    frame.remote64,
                    {
                        "type": iotdefinitions.EVENT_DEVICE_PROPERTY_UPDATE,
                        "properties": [
                            {
                                "property": iotdefinitions.PROPERTY_MANUFACTURERNAME,
                                "value": manufacturer
                            }
                        ]
                    }
                );

                //events.emit(
                //    events.TYPES.ONIOTEVENT,
                //    constants.IOTPROPERTY_UPDATE,
                //    {
                //        id: frame.remote64,
                //        property: {
                //            name: "manufacturername",
                //            value: manufacturer
                //        }
                //    }
                //);       
            }
            else if (attr1a == 0x05) {
                var datatype = reader.nextUInt8();
                if (datatype != 0x42) {
                    logger.error("handle_cluster_basic() data type for 0005 is NOT string (0x42)");
                    return;
                }

                reader.nextUInt8();
                var strbuffer = reader.restAll();
                var modelid = strbuffer.toString('utf8');
                logger.debug("modelid: %s", modelid);
                // 0x0005 ModelIdentifier
                this.dispatch_datarcv_event(
                    frame.remote64,
                    {
                        "type": iotdefinitions.EVENT_DEVICE_PROPERTY_UPDATE,
                        "properties": [
                            {
                                "property": iotdefinitions.PROPERTY_MODELIDENTIFIER,
                                "value": modelid
                            }
                        ]
                    }
                );

                //events.emit(
                //    events.TYPES.ONIOTEVENT,
                //    constants.IOTPROPERTY_UPDATE,
                //    {
                //        id: frame.remote64,
                //        property: {
                //            name: "modelidentifier",
                //            value: modelid
                //        }
                //    }
                //);       
            }

        }
        catch (err) {
            logger.error("handle_cluster_basic error: %j", err);
            if (frame && frame.data) {
                try {
                    console.log(util.inspect(frame.data));
                }
                catch (serr) { }
            }
        }
    }

    send(cmd, callback) {
        try {
            if (!cmd) {
                return callback("invalid payload data at XBEE send()");
            }

            var destinationEndpoint;
            var sourceEndpoint;
            if (cmd.profileId == 0x0000) {
                destinationEndpoint = 0x00;
                sourceEndpoint = 0x00;
            }
            else {
                sourceEndpoint = MYENDPOINT;
                if (devices[cmd.destination64] && devices[cmd.destination64].endpoints && devices[cmd.destination64].endpoints.length > 0) {
                    destinationEndpoint = devices[cmd.destination64].endpoints[0];
                }
                else {
                    destinationEndpoint = 0x01;
                }
            }

            var txframe = { // AT Request to be sent to 
                type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
                destination64: cmd.destination64,
                destination16: cmd.destination16 || 'fffe',
                sourceEndpoint: sourceEndpoint,
                destinationEndpoint: destinationEndpoint,
                clusterId: cmd.clusterId,
                profileId: cmd.profileId,
                data: cmd.data
            };

            if (cmd.txid && callback && ((callback instanceof Function) || (typeof callback === "function"))) {
                var txid = cmd.txid;
                var taskid = cmd.taskid;
                var address64 = cmd.destination64;
                var timer = 0

                if (cmd.timeout) {
                    timer = setTimeout(
                        () => {
                            this.delete_pending_task(taskid, address64);
                            callback(constants.IOT_ERROR_TIMEDOUT); //-2 = timed out
                        },
                        cmd.timeout
                    );
                }

                // create a pending task for it
                this.add_pending_task(
                    {
                        taskid: taskid,
                        address64: cmd.destination64,
                        fn: callback,
                        timer: timer
                    }
                );
            }

            serialport.write(xbee.buildFrame(txframe));

            //
        }
        catch (err) {
            callback(err);
        }
    }

    init() {
        logger.debug("XBEE handler init");

        this.is_portopened = false;

        // get the gateway address64
        var devices = config.iot_config.devices;
        devices.forEach((item) => {
            if (item.id && item.type == constants.IOT_DEVICE_GATEWAY && item.mcu == "xbee") {
                this.gateway = item.id.toLowerCase();
            }
        });

        if (!this.gateway) {
            return logger.error("XBEE chipset was configured for Zigbee. An XBEE gateway must exists in the configuration file.");
        }

        logger.debug("Zigbee gateway is XBEE chipset, address64: " + this.gateway);

        var port = config.iot_config.serialport;
        logger.debug("xbee init(), try open serial port: " + port);

        serialport = new SerialPort(
            port,
            {
                baudrate: 9600
            },
            function (err) {
                if (err) {
                    logger.error('Serial port error: ', err.message);
                }
            }
        );

        serialport.on("open", (err) => {
            if (err) {
                return logger.error('Error opening port: ', err.message);
            }

            logger.debug('serial port is opened');

            this.is_portopened = true;

            // get the neighbor table
            setTimeout(
                () => {
                    this.get_routing_table();
                },
                1000
            );

            //
        });


        serialport.on("data", function (data) {
            xbee.parseRaw(data);
        });

        serialport.on("close", (err) => {
            if (err && err.disconnected == true) {
                logger.info('Serial port is disconnected');
            }
            this.is_portopened = false;
        });
        
        //
    }

    handle_frame(frame) {        
        switch (frame.clusterId) {
            case "0000":
                this.handle_cluster_basic(frame);
                break;
            case "0013":
                this.handle_cluster_deviceannounce(frame);
                break;
            case "8032":
                this.handle_cluster_routingtable(frame);
                break;
            case "8031":
                this.handle_cluster_neighbortable(frame);
                break;
            case "0006":
                this.handle_cluster_mdrhaswitch(frame);  
                break;
            case "0402":
                this.handle_cluster_temperature(frame);
                break;
            case "0b04":
                this.handle_cluster_electricmeasure(frame);
                break;
            case "8005":
                this.handle_cluster_activeendpoint_response(frame);
                break;
            case "8004":
                this.handle_cluster_simpledesciptor_response(frame);
                break;
            default:
                break;
        }
    }

    init_xbee_framehandler() {
        xbee.on("frame_object", (frame) => {
            try {
                if (!frame || !frame.clusterId) {
                    return;
                }

                console.log("frame type: " + frame.type + " clusterid: " + frame.clusterId);

                this.handle_frame(frame);

                //
            }
            catch (err) {
                logger.error("on XBEE frame handler error: %j", err);
            }
        });
    }

    monitor() {
        setInterval(
            () => {
                if (!this.is_portopened) {
                    //console.log("try to init");
                    return this.init();
                }
            },
            30000
        );
    }
}

module.exports = XbeeHandler;

