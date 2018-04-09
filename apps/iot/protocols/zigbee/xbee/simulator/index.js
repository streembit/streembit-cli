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
const util = require('util');
const SerialPort = require('./serialport');
const logger = require("streembit-util").logger;
const config = require('libs/config');
const events = require("streembit-util").events;
const constants = require("libs/constants");
const iotdefinitions = require("apps/iot/definitions");
const BufferReader = require('buffer-reader');
const BitStream = require('libs/utils/bitbuffer').BitStream;
const sprintf = require('sprintf-js').sprintf;
const Devices = require("libs/devices");
const async = require("async");

const MYENDPOINT = 0x02; // TODO review this to set it dynamcally

const BIND_ID_ONOFFSWITCH = 0x50;
const BIND_ID_ELECTRICAL_MEASUREMENT = 0x51;
const BIND_ID_TEMPERATURE = 0x52;
const BIND_ID_OCCUPANCY = 0x53;

let C = xbeeapi.constants;

let xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

let serialport = 0;
//let pending_tasks = [];
let devices = {};
let neighbortable = [];

class XbeeSimulator {

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


    handle_cluster_8004(frame) {

        frame = frame || 'SAMPLE_FRAME';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_CLUSTERSRCV,
                "deviceid": 'frame_remote64',
                "descriptor":  {
                    "endpoint": 'SAMPLE_DATA',
                    "clusters": 'SAMPLE_DATA'
                }
            }
        );
    }

    handle_cluster_8005(frame) {

        frame = frame || 'SAMPLE_FRAME';

        //if (endpoints.length) {
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_ENDPOINTSRCV,
                    "deviceid": 'frame_remote64',
                    "endpoints": 'endpoints'
                }
            );
        //}

        //
    }

    handle_cluster_0b04_01(frame, reader) {

        frame = frame || 'SAMPLE_FRAME';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": 'frame_device',
                "properties": 'properties'
            }
        );
    }

    handle_cluster_0b04_0a(frame, reader) {

        frame = frame || 'SAMPLE_FRAME';

        //if (property_name) {
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                    "deviceid": 'frame_remote64',
                    "properties": [
                        {
                            "property": 'property_name',
                            "value": 'value'
                        }
                    ]
                }
            );
        //}
    }

    handle_cluster_0b04(frame) {
        //logger.debug(util.inspect(frame));
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

        frame = frame || 'SAMPLE_FRAME';
        reader = reader || 'SAMPLE_READER';

        //if (attribute == 0x0000 && datatype == 0x18) {
            var value = reader.nextUInt8();
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                    "deviceid": 'frame_remote64',
                    "properties": [
                        {
                            "property": iotdefinitions.PROPERTY_OCCUPANCY,
                            "value": 'value'
                        }
                    ]
                }
            );
        //}
    }

    handle_cluster_0406(frame) {
        //logger.debug(util.inspect(frame));
        var reader = new BufferReader(frame.data);
        reader.seek(2);
        var zcl_command = reader.nextUInt8();

        if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
            //logger.debug(util.inspect(frame));
            this.handle_cluster_0406_0a(frame, reader);
        }
    }

    handle_cluster_0402_01(frame, reader) {

        frame = frame || 'SAMPLE_FRAME';
        reader = reader || 'SAMPLE_READER';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": 'frame_remote64',
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

        frame = frame || 'SAMPLE_FRAME';
        reader = reader || 'SAMPLE_READER';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE,
                "deviceid": 'frame_remote64',
                "properties": [
                    {
                        "property": iotdefinitions.PROPERTY_TEMPERATURE,
                        "value": 'value'
                    }
                ]
            }
        );
    }

    handle_cluster_0402(frame) {

        frame = frame || 'SAMPLE_FRAME';

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
            logger.debug(util.inspect(frame.data));
            var status = reader.nextUInt8();
            if (status == 0x00) {
                this.dispatch_datarcv_event(
                    {
                        "type": iotdefinitions.EVENT_REPORT_CONFIGURED,
                        "deviceid": 'frame_remote64',
                        "status": 0
                    }
                );
            }
        }

        //
    }

    handle_cluster_0000(frame) {
        try {
            //logger.debug(util.inspect(frame));

            frame = frame || 'SAMPLE_FRAME';

            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_INFO,
                    "deviceid": 'frame_remote64',
                    "properties": 'properties'
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

        frame = frame || 'SAMPLE_FRAME';

        //logger.debug(util.inspect(frame));
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
            }

            // binding was successful notify the device
            this.dispatch_datarcv_event(
                {
                    "type": iotdefinitions.EVENT_DEVICE_BINDSUCCESS,
                    "deviceid": 'frame_remote64',
                    "cluster": 'cluster'
                }
            );
        }
    }

    handle_ZDO_match_descriptor_request(frame) {
        logger.debug("Match Descriptor Request from " + frame.remote64);

        frame = frame || 'SAMPLE_FRAME';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_CONTACTING,
                "deviceid": 'frame_remote64',
                "devicedetails": [
                    {
                        "name": "address64",
                        "value": 'frame_remote64',
                    },
                    {
                        "name": "address16",
                        "value": 'frame_remote16'
                    }
                ]
            }
        );


        if (devices[frame.remote64] && devices[frame.remote64].endpoints && devices[frame.remote64].endpoints.length) {
            //logger.debug("- - - - active endpoint is known for device " + frame.remote64 + " endpoints: " + util.inspect(devices[frame.remote64].endpoints))
            return;
        }
    }

    handle_HA_switchcluster_response(frame) {

        frame = frame || 'SAMPLE_FRAME';

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
        //logger.debug(util.inspect(frame));
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
            frame = frame || 'SAMPLE_FRAME';

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
        frame = frame || 'SAMPLE_FRAME';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_ONLINE,
                "deviceid": 'frame_remote64',
                "address64": 'frame_remote64',
                "address16": 'frame_remote16',
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
        frame = frame || 'SAMPLE_FRAME';

        this.dispatch_datarcv_event(
            {
                "type": iotdefinitions.EVENT_DEVICE_ANNOUNCE,
                "deviceid": 'frame_remote64',
                "address64": 'frame_remote64',
                "address16": 'frame_remote16',
                "protocol": iotdefinitions.ZIGBEE,
                "mcu": "xbee"
            }
        );
    }

    handle_cluster_8036(frame) {
        logger.debug(util.inspect(frame));
    }

    check_online_devices(){
        try {
            var offline_devices = [];

            this.configured_devices.forEach(
                (ieeeaddr) => {
                    if (this.online_devices.indexOf(ieeeaddr) == -1) {
                        //logger.debug("device " + ieeeaddr + " not online");
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
        const devices = 'DEVICES';

        this.is_portopened = false;

        // get the gateway address64
        //var devices = Devices.list();
        devices.forEach((item) => {
            if (item.permission == iotdefinitions.PERMISSION_ALLOWED) {
                this.configured_devices.push(item.deviceid);
                if (item.deviceid && item.type == iotdefinitions.IOT_DEVICE_GATEWAY && item.mcu == "xbee") {
                    this.gateway = item.deviceid.toLowerCase();
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
}

module.exports = XbeeSimulator;
