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

const xbeeapi = require('./xbeeapi');


import { logger, events } from "streembit-util";


import { config } from "../../../../../libs/config/index.js";
import { definitions as iotdefinitions } from '../../../../iot/definitions.js'
import BufferReader from 'buffer-reader';
import { BitStream } from '../../../../../libs/utils/bitbuffer.js';
import Devices from '../../../../../libs/devices/index.js';
import util from 'util';
import SerialPort from "serialport";
import { sprintf } from 'sprintf-js';
import async from 'async';

const MYENDPOINT = 0x02; // TODO review this to set it dynamcally

const BIND_ID_ONOFFSWITCH = 0x50;
const BIND_ID_ELECTRICAL_MEASUREMENT = 0x51;
const BIND_ID_TEMPERATURE = 0x52;
const BIND_ID_OCCUPANCY = 0x53;
const BIND_ID_HUMIDITY = 0x55;
const BIND_ID_ALARM = 0x56;


let C = xbeeapi.constants;

let xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

let serialport = 0;
//let pending_tasks = [];
let devices = {};
let neighbortable = [];

class XbeeHandler {

    constructor() {
        this.is_portopened = false;
        this.gateway = 0;
        this.init_xbee_framehandler();
        this.online_devices = [];
        this.configured_devices = [];
        this.last_onlinedevice_check = 0;
    }

    dispatch_datarcv_event(payload) {
        try {
            if (!payload) {
                throw new Error("dispatch_datarcv_event() invalid payload");
            }

            //logger.debug("IOT_DATA_RECEIVED_EVENT")
            var eventname = iotdefinitions.IOT_DATA_RECEIVED_EVENT;
            events.emit(eventname, payload);
        }
        catch (err) {
            logger.error("dispatch_datarcv_event error: %j", err)
        }
    }

    dispatch_error_event(address64, error) {
        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_RADIO_ERROR,
                "deviceid": address64,
                "error": error
            }
        );
    }

    // utility helpers

    swapEUI64toLittleEndian(eui64) {
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

    swapEUI64BuffertoBigEndian(eui64) {
        if (!eui64 || eui64.length != 8 || !Buffer.isBuffer(eui64)) {
            throw new Error("Invalid EUI64 buffer, eui64 param must be a 8 byte lenght buffer");
        }

        var final = Buffer.alloc(8);
        var index = 0;
        for (let i = eui64.length - 1; i >= 0; i--) {
            final[index++] = eui64[i];
        }

        return final;
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


    simple_descriptor_request(address64, address16, data) {
        logger.debug("simple_descriptor_request to " + address64);
        var txframe = {
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
        logger.debug("active_endpoint_request to " + address64);
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
        logger.debug("match_descriptor_response to " + address64);
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
        logger.debug("simple_basciccluster_request to " + address64);
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


    handle_cluster_8031(frame) {
        try {
            logger.debug(`handle_cluster_8031 ${util.inspect(frame)}`);
            var clusterId = 0x0031;

            var bufflen = frame.data.length;
            var reader = new BufferReader(frame.data);
            var id = reader.nextUInt8();
            var status = reader.nextUInt8();
            var devices_length = reader.nextUInt8();
            var startindex = reader.nextUInt8();
            var count = reader.nextUInt8();

            if (count <= 0) {
                return;
            }

            var parsed = 0;
            while (parsed < count) {

                var device = {};

                var panidbuf = reader.nextBuffer(8);
                panidbuf.swap64();
                var panid = panidbuf.toString("hex");
                //logger.debug("panidbuf: %s", panid);
                var addressbuf = reader.nextBuffer(8);
                addressbuf.swap64();
                var address = addressbuf.toString("hex");
                //logger.debug("address: %s", address);
                var shortaddrbuf = reader.nextBuffer(2);
                shortaddrbuf.swap16();
                var address16 = shortaddrbuf.toString("hex");
                //logger.debug("address16: %s", address16);

                var devinfobuf = reader.nextBuffer(1);
                var devinfobits = new BitStream(devinfobuf);
                var device_type = devinfobits.readBits(2);
                //logger.debug("device_type: %s", device_type);
                var iddle_enable = devinfobits.readBits(2);
                //logger.debug("iddle_enable: %s", iddle_enable);
                device.iddle_enable = iddle_enable;

                //Indicates if the neighbor’s receiver is enabled during idle times.
                //0x0 – Receiver is off
                //0x1 – Receiver is on
                //0x02 – Unknown


                var relationship = devinfobits.readBits(3);
                //logger.debug("relationship: %s", relationship);
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
                //logger.debug("permitjoin: %s", permitjoin);

                //Indicates if the neighbor is accepting join requests.
                //0x0 – Neighbor not accepting joins
                //0x1 – Neighbor is accepting joins
                //0x2 – Unknown


                var depth = reader.nextUInt8();
                var lqi = reader.nextUInt8();
                device.depth = depth;
                device.lqi = lqi;
                //logger.debug("depth: %d, lqi: %d", depth, lqi);
                var address64 = address.toLowerCase();
                device.address64 = address64;
                device.address16 = address16;

                neighbortable.push(device);

                parsed++;
            };

        }
        catch (err) {
            logger.error("handle_cluster_8031 error: %j", err);
        }
    };

    handle_cluster_8004(frame) {
        logger.debug(`handle_cluster_8004 ${util.inspect(frame)}`);

        let reader = new BufferReader(frame.data);
        let id = reader.nextUInt8();
        let status = reader.nextUInt8();
        if (status != 0) {
            return logger.error("Simple Descriptor Request status: error for device " + frame.remote64);
        }

        let address = reader.nextUInt16LE();
        let length = reader.nextUInt8();
        let endpoint = reader.nextUInt8();
        let profile = reader.nextUInt16LE();

        //logger.debug("address: %s, length: %d, endpoint: %d, profile: %s", sprintf("0x%04x", address), length, endpoint, sprintf("0x%04x", profile));

        reader.seek(11);
        var count = reader.nextUInt8();
        var inputclusters = [];
        for (let i = 0; i < count; i++) {
            let cluster = reader.nextUInt16LE();
            let txtcluster = sprintf("%04x", cluster);
            inputclusters.push(txtcluster);
        }

        logger.debug(frame.remote64 + " clusters: " + util.inspect(inputclusters));

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_CLUSTERSRCV,
                "deviceid": frame.remote64,
                "descriptor": {
                    "endpoint": endpoint,
                    "clusters": inputclusters
                }
            }
        );

        // get the manufacturer & device info 
        setTimeout(
            () => {
                //logger.debug("query device info, hardware version");
                var endpoint = devices[frame.remote64].endpoints[0];
                var txn = 0x99;
                var bcrdata = [0x00, txn, 0x00, 0x03, 0x00]
                this.simple_basciccluster_request(frame.remote64, frame.remote16, endpoint, bcrdata);
            },
            2000
        );

        setTimeout(
            () => {
                //logger.debug("query device info, manufacturer");
                var endpoint = devices[frame.remote64].endpoints[0];
                var txn = 0x99;
                var bcrdata = [0x00, txn, 0x00, 0x04, 0x00]
                this.simple_basciccluster_request(frame.remote64, frame.remote16, endpoint, bcrdata);
            },
            2500
        );

        setTimeout(
            () => {
                //logger.debug("query device info, model number");
                var endpoint = devices[frame.remote64].endpoints[0];
                var txn = 0x99;
                var bcrdata = [0x00, txn, 0x00, 0x05, 0x00]
                this.simple_basciccluster_request(frame.remote64, frame.remote16, endpoint, bcrdata);
            },
            3000
        );
    }

    handle_cluster_8005(frame) {
        logger.debug(`handle_cluster_8005 ${util.inspect(frame)}`);
        if (frame.profileId != "0000") {
            return logger.debug("INVALID profileID for clusterId 0x8005")
        }

        if (this.online_devices.indexOf(frame.remote64) == -1) {
            this.online_devices.push(frame.remote64);
            logger.debug(`${frame.remote64} added to online_devices list`);
        }

        if (!devices[frame.remote64]) {
            devices[frame.remote64] = { address16: frame.remote16, endpoints: 0, clusters: 0 };
        }

        var reader = new BufferReader(frame.data);
        var id = reader.nextUInt8();
        var status = reader.nextUInt8();

        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        var destaddress = valuebuf.readUInt16BE(0);

        var number_of_endpoints = reader.nextUInt8();
        var endpoints = [];
        for (var i = 0; i < number_of_endpoints; i++) {
            var endpoint = reader.nextUInt8();
            endpoints.push(endpoint);
        }

        if (endpoints.length) {
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_ENDPOINTSRCV,
                    "deviceid": frame.remote64,
                    "endpoints": endpoints
                }
            );
        }

        //
    }

    handle_cluster_0b04_01(frame, reader) {
        logger.debug(util.inspect(frame));

        function read_next_attribute() {
            try {
                let property_name, value;
                let attribute = reader.nextUInt16LE();
                logger.debug("attribute: %s", sprintf("0x%04x", attribute));

                let status = reader.nextUInt8();
                if (status != 0x00) {
                    return null;
                }
                let datatype = reader.nextUInt8();

                if (attribute == 0x050b && datatype == 0x29) {
                    value = reader.nextInt16LE();
                    property_name = iotdefinitions.PROPERTY_ACTIVEPOWER;
                }
                else if (attribute == 0x0505 && datatype == 0x21) {
                    value = reader.nextUInt16LE();
                    property_name = iotdefinitions.PROPERTY_VOLTAGE;
                }
                else if (attribute == 0x0605 && datatype == 0x21) {
                    value = reader.nextUInt16LE();
                    property_name = iotdefinitions.PROPERTY_POWERDIVISOR;
                }
                else if (attribute == 0x0604 && datatype == 0x21) {
                    value = reader.nextUInt16LE();
                    property_name = iotdefinitions.PROPERTY_POWERMULTIPLIER;
                }
                else if (attribute == 0x0600 && datatype == 0x21) {
                    value = reader.nextUInt16LE();
                    property_name = iotdefinitions.PROPERTY_VOLTAGEMULTIPLIER;
                }
                else if (attribute == 0x0601 && datatype == 0x21) {
                    value = reader.nextUInt16LE();
                    property_name = iotdefinitions.PROPERTY_VOLTAGEDIVISOR;
                }

                if (property_name) {
                    logger.debug(`property: ${property_name} datatype:${datatype}, value: ${value}`);
                    return {
                        "property": property_name,
                        "value": value
                    };
                }
                else {
                    return null;
                }
            }
            catch (err) {
                logger.error('handle_cluster_0b04_01() error: ' + err.message);
                return null;
            }
        }

        var bufferlen = frame.data.length;
        var properties = [];

        var currpos = reader.tell();
        var remaining = bufferlen - currpos;

        while (remaining > 4) {
            var prop = read_next_attribute();
            if (prop) {
                properties.push(prop);
            }
            currpos = reader.tell();
            remaining = bufferlen - currpos;
        }

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": frame.remote64,
                "properties": properties
            }
        );
    }

    handle_cluster_0b04_0a(frame, reader) {
        var property_name = 0;
        var value = 0;

        // get the attributes
        var attribute = reader.nextUInt16LE();
        //logger.debug("attribute: %s", sprintf("0x%04x", attribute));
        var datatype = reader.nextUInt8();

        if (attribute == 0x050b) {
            if (datatype != 0x29) {
                return;
            }
            value = reader.nextInt16LE();
            property_name = iotdefinitions.PROPERTY_ACTIVEPOWER;
        }
        else if (attribute == 0x0505) {
            if (datatype != 0x21) {
                return;
            }
            value = reader.nextUInt16LE();
            property_name = iotdefinitions.PROPERTY_VOLTAGE;
        }

        if (property_name) {
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                    "deviceid": frame.remote64,
                    "properties": [
                        {
                            "property": property_name,
                            "value": value
                        }
                    ]
                }
            );
        }
    }

    handle_cluster_0b04(frame) {
        logger.debug(`handle_cluster_0b04 ${util.inspect(frame)}`);

        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();
        //logger.debug("zcl_command: %s", sprintf("0x%02x", zcl_command));

        if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
            //logger.debug(util.inspect(frame));
            this.handle_cluster_0b04_0a(frame, reader);
        }
        else if (zcl_command == 0x01) {  // ZCL 0x01 Read attributes response 7.2
            this.handle_cluster_0b04_01(frame, reader);
        }

        //
    }

    handle_cluster_0406_0a(frame, reader) {
        // get the attributes
        var attribute = reader.nextUInt16LE();
        //logger.debug("attribute: %s", sprintf("0x%04x", attribute));
        var datatype = reader.nextUInt8();

        if (attribute == 0x0000 && datatype == 0x18) {
            var value = reader.nextUInt8();
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                    "deviceid": frame.remote64,
                    "properties": [
                        {
                            "property": iotdefinitions.PROPERTY_OCCUPANCY,
                            "value": value
                        }
                    ]
                }
            );
        }
    }

    handle_cluster_0406(frame) {
        logger.debug(`handle_cluster_0406 ${util.inspect(frame)}`);

        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();

        if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
            //logger.debug(util.inspect(frame));
            this.handle_cluster_0406_0a(frame, reader);
        }
    }

    handle_cluster_0402_01(frame, reader) {
        logger.debug(`handle_cluster_0402_01 ${util.inspect(frame)}`);

        var attribute = reader.nextUInt16LE();
        //logger.debug("attribute: %s", sprintf("0x%04x", attribute));

        var status = reader.nextUInt8();
        if (status != 0) {
            return this.dispatch_error_event(frame.remote64, "cluster 0402 invalid status returned");
        }

        var datatype = reader.nextUInt8();
        if (datatype != 0x29) {
            return this.dispatch_error_event(frame.remote64, "cluster 0402 invalid data type returned");
        }

        var tempvalue = reader.nextUInt16LE();
        var value = tempvalue * 0.01;

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": frame.remote64,
                "properties": [
                    {
                        "property": iotdefinitions.PROPERTY_TEMPERATURE,
                        "value": value
                    }
                ]
            }
        );
    }

    handle_cluster_0402_0a(frame, reader) {
        logger.debug(`handle_cluster_0402_0a ${util.inspect(frame)}`);

        var attribute = reader.nextUInt16LE();
        //logger.debug("attribute: %s", sprintf("0x%04x", attribute));

        var datatype = reader.nextUInt8();
        if (datatype != 0x29) {
            return this.dispatch_error_event(frame.remote64, "cluster 0402 invalid data type returned");
        }

        var tempvalue = reader.nextUInt16LE();
        var value = tempvalue * 0.01;

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": frame.remote64,
                "properties": [
                    {
                        "property": iotdefinitions.PROPERTY_TEMPERATURE,
                        "value": value
                    }
                ]
            }
        );
    }

    handle_cluster_0402(frame) {
        var properties = [];
        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();
        logger.debug("cluster 0402 zcl_command: %s", sprintf("0x%02x", zcl_command));

        if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
            //logger.debug(util.inspect(frame));
            this.handle_cluster_0402_0a(frame, reader);
        }
        else if (zcl_command == 0x01) {  // ZCL 0x01 Read attributes response 7.2
            this.handle_cluster_0402_01(frame, reader);
        }
        else if (zcl_command == 0x07) {  // ZCL 0x07 Configure reporting response 7.8
            logger.debug(`handle_cluster_0402 zcl_command == 0x07 ${util.inspect(frame)}`);
            var status = reader.nextUInt8();
            if (status == 0x00) {
                this.dispatch_datarcv_event(
                    {
                        "type": iotdefinitions.EVENT_REPORT_CONFIGURED,
                        "deviceid": frame.remote64,
                        "status": 0
                    }
                );
            }
        }

        //
    }

    handle_cluster_0405_01(frame, reader) {
        logger.debug(`handle_cluster_0405_01 ${util.inspect(frame)}`);

        var attribute = reader.nextUInt16LE();
        //logger.debug("attribute: %s", sprintf("0x%04x", attribute));

        var status = reader.nextUInt8();
        if (status != 0) {
            return this.dispatch_error_event(frame.remote64, "cluster 0405 invalid status returned");
        }

        var datatype = reader.nextUInt8();
        if (datatype != 0x21) {
            return this.dispatch_error_event(frame.remote64, "cluster 0405 invalid data type returned");
        }

        var value = reader.nextUInt16LE();

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": frame.remote64,
                "properties": [
                    {
                        "property": iotdefinitions.PROPERTY_RELATIVE_HUMIDITY,
                        "value": value
                    }
                ]
            }
        );
    }

    handle_cluster_0405_0a(frame, reader) {
        logger.debug(`handle_cluster_0405_0a ${util.inspect(frame)}`);

        var attribute = reader.nextUInt16LE();
        //logger.debug("attribute: %s", sprintf("0x%04x", attribute));

        var datatype = reader.nextUInt8();
        if (datatype != 0x21) {
            return this.dispatch_error_event(frame.remote64, "cluster 0405 invalid data type returned");
        }

        var value = reader.nextUInt16LE();

        logger.debug("attribute: %s value: %d", sprintf("0x%04x", attribute), value);

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": frame.remote64,
                "properties": [
                    {
                        "property": iotdefinitions.PROPERTY_RELATIVE_HUMIDITY,
                        "value": value
                    }
                ]
            }
        );
    }

    handle_cluster_0405(frame) {
        var properties = [];
        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();

        logger.debug("cluster 0405 zcl_command: %s", sprintf("0x%02x", zcl_command));

        if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
            //logger.debug(util.inspect(frame));
            this.handle_cluster_0405_0a(frame, reader);
        }
        else if (zcl_command == 0x01) {  // ZCL 0x01 Read attributes response 7.2
            this.handle_cluster_0405_01(frame, reader);
        }
        else if (zcl_command == 0x07) {  // ZCL 0x07 Configure reporting response 7.8
            logger.debug(`handle_cluster_0405 zcl_command == 0x07 ${util.inspect(frame)}`);
            var status = reader.nextUInt8();
            if (status == 0x00) {
                this.dispatch_datarcv_event(
                    {
                        "type": iotdefinitions.EVENT_REPORT_CONFIGURED,
                        "deviceid": frame.remote64,
                        "status": 0
                    }
                );
            }
        }
    }

    handle_cluster_0500(frame) {
        var properties = [];
        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();

        logger.debug("cluster 0500 zcl_command: %s", sprintf("0x%02x", zcl_command));

        process.exit(0);
    }

    handle_cluster_0000(frame) {
        try {
            logger.debug(`handle_cluster_0000 ${util.inspect(frame)}`);

            var reader = new BufferReader(frame.data);
            reader.seek(1);
            var id = reader.nextUInt8();
            var command = reader.nextUInt8();
            //logger.debug("id: %s command %d", id.toString(16), command);
            if (command != 0x01) {
                return logger.error("handle_cluster_0000() command");
            }

            var read_next_attribute = function read_next_attribute() {
                try {
                    let property_name, value;
                    let attribute = reader.nextUInt16LE();
                    logger.debug("attribute: %s", sprintf("0x%04x", attribute));

                    let status = reader.nextUInt8();
                    if (status != 0x00) {
                        return null;
                    }
                    let datatype = reader.nextUInt8();

                    if (attribute == 0x0003) {
                        if (datatype == 0x20) {
                            value = reader.nextUInt8();
                            property_name = iotdefinitions.PROPERTY_HWVERSION;
                        }
                    }
                    else if (attribute == 0x0004) {
                        if (datatype == 0x42) {
                            var len = reader.nextUInt8();
                            var strbuffer = reader.nextBuffer(len);
                            value = strbuffer.toString('utf8');
                            property_name = iotdefinitions.PROPERTY_MANUFACTURERNAME;
                        }
                    }
                    else if (attribute == 0x0005) {
                        if (datatype == 0x42) {
                            var len = reader.nextUInt8();
                            var strbuffer = reader.nextBuffer(len);
                            value = strbuffer.toString('utf8');
                            property_name = iotdefinitions.PROPERTY_MODELIDENTIFIER;
                        }
                    }

                    if (property_name) {
                        return {
                            "property": property_name,
                            "value": value
                        };
                    }
                    else {
                        return null;
                    }
                }
                catch (err) {
                    logger.error('handle_cluster_0b04_01() error: ' + err.message);
                    return null;
                }
            }

            var bufferlen = frame.data.length;
            var properties = {};
            properties[iotdefinitions.PROPERTY_HWVERSION] = 0;
            properties[iotdefinitions.PROPERTY_MANUFACTURERNAME] = 0;
            properties[iotdefinitions.PROPERTY_MODELIDENTIFIER] = 0;

            var currpos = reader.tell();
            var remaining = bufferlen - currpos;

            while (remaining > 4) {
                var prop = read_next_attribute();
                if (prop) {
                    properties[prop.property] = prop.value;
                }
                currpos = reader.tell();
                remaining = bufferlen - currpos;
            }

            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_INFO,
                    "deviceid": frame.remote64,
                    "properties": properties
                }
            );

            //
        }
        catch (err) {
            logger.error("handle_cluster_0000 error: %j", err);
        }
    }

    handle_cluster_0020(frame) {
        //logger.debug(util.inspect(frame));
    }

    handle_cluster_8034(frame) {
        //logger.debug(util.inspect(frame));
    }

    handle_cluster_8021(frame) {
        logger.debug(`handle_cluster_8021 ${util.inspect(frame)}`);
        if (frame.profileId == "0000") {
            // ZDO bind response
            var reader = new BufferReader(frame.data);
            var id = reader.nextUInt8();
            var status = reader.nextUInt8();
            if (status != 0) {
                var errmsg = "binding failed, error code: %s" + sprintf("0x%02x", status);
                return this.dispatch_error_event(frame.remote64, errmsg);
            }

            var cluster;
            switch (id) {
                case BIND_ID_ONOFFSWITCH:
                    cluster = "0006";
                    break;
                case BIND_ID_ELECTRICAL_MEASUREMENT:
                    cluster = "0b04";
                    break;
                case BIND_ID_TEMPERATURE:
                    cluster = "0402";
                    break;
                case BIND_ID_OCCUPANCY:
                    cluster = "0406";
                    break;
                case BIND_ID_HUMIDITY:
                    cluster = "0405";
                    break;
                case BIND_ID_ALARM:
                    cluster = "0500";
                    break;
                default:
                    logger.debug(`handle_cluster_8021 id: ${id} is not handled`);
                    break;
            }

            // binding was successful notify the device
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_BINDSUCCESS,
                    "deviceid": frame.remote64,
                    "cluster": cluster
                }
            );
        }
    }

    handle_ZDO_match_descriptor_request(frame) {
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

        //logger.debug("Match Descriptor Request id: %s, dest: %s", id.toString(16), destaddress.toString(16));

        valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        var requested_profile = valuebuf.readUInt16BE(0);
        //logger.debug("requested profile: %s", requested_profile.toString(16));

        var number_of_input_clusters = reader.nextUInt8();
        //logger.debug("number_of_input_clusters: %d", number_of_input_clusters);

        // reply with 8006
        const respbuf = Buffer.alloc(6);
        respbuf.writeUInt8(0x11, 0); // transaction sequence number (arbitrarily chosen)
        respbuf.writeUInt8(0x00, 1); // status
        respbuf.writeUInt16LE(0x0000, 2); // Indicates the 16-bit address of the responding device, this is the coordinator with address 0x0000
        respbuf.writeUInt8(0x01, 4); // 1 endpoint
        respbuf.writeUInt8(MYENDPOINT, 5); // set endpoint tp 0x02

        this.match_descriptor_response(frame.remote64, frame.remote16, respbuf);

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_CONTACTING,
                "deviceid": frame.remote64,
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
            //logger.debug("- - - - active endpoint is known for device " + frame.remote64 + " endpoints: " + util.inspect(devices[frame.remote64].endpoints))
            return;
        }

        // send Active Endpoint Request 0x0005
        var addressbuf = Buffer.from(frame.remote16, 'hex');
        addressbuf.swap16();
        const aerbuf = Buffer.alloc(3);
        aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
        addressbuf.copy(aerbuf, 1);
        var aerdata = [...aerbuf];
        //logger.debug("Active Endpoint Request data: " + util.inspect(aerdata));
        this.active_endpoint_request(frame.remote64, frame.remote16, aerdata);
    }

    handle_HA_switchcluster_response(frame) {
        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();
        //logger.debug("zcl_command: %s", sprintf("0x%02x", zcl_command));

        if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11 
            // get the attributes
            var attribute = reader.nextUInt16LE();
            //logger.debug("attribute: %s", sprintf("0x%04x", attribute));

            if (attribute == 0x0000) { // active power 
                var datatype = reader.nextUInt8();

                if (datatype != 0x10) {
                    return;
                }

                var value = reader.nextUInt8();
                this.dispatch_datarcv_event(
                    {
                        "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                        "deviceid": frame.remote64,
                        "properties": [
                            {
                                "property": iotdefinitions.PROPERTY_SWITCH_STATUS,
                                "value": value
                            }
                        ]
                    }
                );
            }

        }
        else if (zcl_command == 0x01) {  // ZCL 0x01 Read attributes response 7.2
            var attribute = reader.nextUInt16LE();
            //logger.debug("attribute: %s", sprintf("0x%04x", attribute));

            if (attribute == 0x0000) { // active power 
                var status = reader.nextUInt8();
                if (status != 0x00) {
                    return logger.error('Switch cluster read attribute response error status: ' + status);;
                }

                var datatype = reader.nextUInt8();

                if (datatype != 0x10) {
                    return;
                }

                var value = reader.nextUInt8();
                this.dispatch_datarcv_event(
                    {
                        "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                        "deviceid": frame.remote64,
                        "properties": [
                            {
                                "property": iotdefinitions.PROPERTY_SWITCH_STATUS,
                                "value": value
                            }
                        ]
                    }
                );
            }
        }
        else if (zcl_command == 0x07) {  // ZCL 0x07 Configure reporting response 7.8
            logger.debug(util.inspect(frame.data));

            var status = reader.nextUInt8();
            if (status == 0x00) {
                this.dispatch_datarcv_event(
                    {
                        "type": iotdefinitions.EVENT_REPORT_CONFIGURED,
                        "deviceid": frame.remote64,
                        "status": 0
                    }
                );
            }
        }

    }

    handle_cluster_0006(frame) {
        logger.debug(`handle_cluster_0006 ${util.inspect(frame)}`);
        if (frame.profileId == "0000") {
            // this is a ZDO Match Descriptor Request
            this.handle_ZDO_match_descriptor_request(frame);
        }
        else if (frame.profileId == "0104") {
            // this is a HA profile Swich cluster
            this.handle_HA_switchcluster_response(frame);
        }
    }

    handle_cluster_8000(frame) {
        try {
            logger.debug(`handle_cluster_8000 ${util.inspect(frame)}`);

            var reader = new BufferReader(frame.data);
            var id = reader.nextUInt8();
            var status = reader.nextUInt8();
            if (status != 0x00) {
                return;
            }

            var ieebuf = reader.nextBuffer(8);
            var swapped = this.swapEUI64BuffertoBigEndian(ieebuf);
            var ieeestr = swapped.toString("hex")
            logger.debug("IEEE: " + ieeestr);

            var address16 = reader.nextUInt16LE();
            var address16str = sprintf("%02x", address16)
            logger.debug("IEEE: " + ieeestr + " NWK address: " + address16str);

            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_ONLINE,
                    "deviceid": ieeestr,
                    "address64": ieeestr,
                    "address16": address16str,
                    "protocol": iotdefinitions.ZIGBEE,
                    "mcu": "xbee"
                }
            );

            if (this.online_devices.indexOf(ieeestr) == -1) {
                this.online_devices.push(ieeestr);
            }

        }
        catch (err) {
            logger.error("handle_cluster_8000() error: %j", err);
        }
    }

    handle_cluster_8032(frame) {
        logger.debug(`handle_cluster_8032 ${util.inspect(frame)}`);

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_ONLINE,
                "deviceid": frame.remote64,
                "address64": frame.remote64,
                "address16": frame.remote16,
                "protocol": iotdefinitions.ZIGBEE,
                "mcu": "xbee"
            }
        );

        if (this.online_devices.indexOf(frame.remote64) == -1) {
            this.online_devices.push(frame.remote64);
        }


        //
    }

    handle_cluster_0013(frame) {
        logger.debug(`handle_cluster_0013 ${util.inspect(frame)}`);

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_ANNOUNCE,
                "deviceid": frame.remote64,
                "address64": frame.remote64,
                "address16": frame.remote16,
                "protocol": iotdefinitions.ZIGBEE,
                "mcu": "xbee"
            }
        );
    }

    handle_cluster_8036(frame) {
        logger.debug(`handle_cluster_8036 ${util.inspect(frame)}`);
    }

    // Network Address Request
    netaddr_request(address64) {
        try {
            logger.debug("netaddr_request to " + address64);

            var addressbuf = this.swapEUI64toLittleEndian(address64);
            const narbuf = Buffer.alloc(10);
            narbuf.writeUInt8(0x03, 0); // 0x03 transaction sequence number (arbitrarily chosen) 
            addressbuf.copy(narbuf, 1);
            narbuf.writeUInt8(0x00, 9); // Request Type 
            //logger.debug("Network Address Request ClusterID=0x0000 buffer: " + util.inspect(narbuf));
            var txframe = {
                type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
                destination64: "000000000000ffff",
                destination16: "fffe",
                clusterId: 0x0000,
                profileId: 0x0000,
                sourceEndpoint: 0x00,
                destinationEndpoint: 0x00,
                data: narbuf
            };

            serialport.write(xbee.buildFrame(txframe));
        }
        catch (err) {
            logger.error("netaddr_request() error: %j", err);
        }
    }

    send_rtg_request() {
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            clusterId: 0x0032,
            profileId: 0x0000,
            sourceEndpoint: 0x00,
            destinationEndpoint: 0x00,
            data: [0x02, 0x00]
        };

        serialport.write(xbee.buildFrame(txframe));
    }


    send(cmd) {
        try {
            if (!cmd) {
                throw new Error("cmd paameter is required");
            }

            // endpoints must set from the command handler
            var sourceEndpoint = cmd.sourceEndpoint;
            var destinationEndpoint = cmd.destinationEndpoint;

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

            serialport.write(xbee.buildFrame(txframe));

            //
        }
        catch (err) {
            logger.error("XBEE send error: %j", err);
        }
    }

    check_online_devices() {
        try {
            var offline_devices = [];

            this.configured_devices.forEach(
                (ieeeaddr) => {
                    if (this.online_devices.indexOf(ieeeaddr) == -1) {
                        logger.debug("device " + ieeeaddr + " not online");
                        offline_devices.push(ieeeaddr);
                    }
                }
            );

            async.eachSeries(
                offline_devices,
                (ieee_address, callback) => {
                    this.netaddr_request(ieee_address);
                    callback();
                },
                (err) => {
                }
            );
        }
        catch (err) {
            logger.error("check_online_devices() error: %j", err);
        }
    }

    configure() {
        // enumerate the devices using the device settings of the configuration file
        // first send a ZDO 0x0032 to get all connected devices
        // there must be at last a gateway operational and we try to find that first
        logger.debug("configure XBEE send ZDO 0x0032 cluster")
        this.send_rtg_request()
    }

    init() {
        logger.debug("XBEE handler init");

        this.is_portopened = false;

        // get the gateway address64
        var devices = Devices.list();
        devices.forEach((item) => {
            if (item.permission == iotdefinitions.PERMISSION_ALLOWED) {
                var lwcaseid = item.deviceid.toLowerCase();
                this.configured_devices.push(lwcaseid);
                if (item.deviceid && item.type == iotdefinitions.IOT_DEVICE_GATEWAY && item.mcu == "xbee") {
                    this.gateway = lwcaseid;
                }
            }
        });

        if (!this.gateway) {
            return logger.error("XBEE chipset was configured for Zigbee. An XBEE gateway must exists in the database.");
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

            setTimeout(
                () => {
                    this.configure();
                },
                500
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

        // set the onlide device timer value
        this.last_onlinedevice_check = Date.now();

        //
    }

    handle_frame(frame) {
        switch (frame.clusterId) {
            case "0000":
            case "0013":
            case "8032":
            case "8031":
            case "0006":
            case "0402":
            case "0405":
            case "0500":
            case "0b04":
            case "8005":
            case "8004":
            case "0020":
            case "8021":
            case "8000":
            case "0406":
            case "8036":
            case "8034":
                var clusterfn = "handle_cluster_" + frame.clusterId;
                this[clusterfn](frame);
                break;
            default:
                break;
        }
    }

    init_xbee_framehandler() {
        xbee.on("frame_object", (frame) => {
            try {
                if (frame && frame.clusterId) {
                    logger.debug(`frame type: ${frame.type} clusterid: ${frame.clusterId}`);
                    this.handle_frame(frame);
                }

                //
            }
            catch (err) {
                logger.error("on XBEE frame handler error: %j", err);
            }
        });
    }

    dotasks() {
        // check if the devices are online
        //logger.debug("xbee dotasks");
        var currtime = Date.now();
        var lastcheck = this.last_onlinedevice_check;
        if ((currtime - this.last_onlinedevice_check) > 30000) { // TODO: put this value back 30000) {
            //logger.debug("xbee dotasks run");
            if (!this.is_portopened) {
                return this.init();
            }

            this.check_online_devices();
            this.last_onlinedevice_check = Date.now();
        }
    }
}

module.exports = XbeeHandler;

