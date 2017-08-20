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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const constants = require("libs/constants");
const config = require("libs/config");
const logger = require("libs/logger");
const events = require("libs/events");
const WebSocket = require("libs/websocket");
const util = require("util");
const Devices = require("libs/devices")
const ZigbeeGateway = require('libs/iot/device/zigbee/gateway');
const ZigbeeDevice = require('libs/iot/device/zigbee/device');
const iotdefinitions = require("libs/iot/definitions");
const async = require('async');

class IoTHandler {
    constructor() {
        this.protocol_handlers = new Map();
        this.devicelist = new Map();
    }

    getdevice(id) {
        return this.devicelist.get(id);
    }

    setdevice(id, device) {
        this.devicelist.set(id, device);
    }

    getdeviceobj(type, protocol) {
        if (type == constants.IOT_DEVICE_GATEWAY) {
            if (protocol == constants.IOT_PROTOCOL_ZIGBEE) {
                return ZigbeeGateway;
            }
        }
        else if (type == constants.IOT_DEVICE_ENDDEVICE) {
            if (protocol == constants.IOT_PROTOCOL_ZIGBEE) {
                return ZigbeeDevice;
            }
        }
    }

    device_factory(device) {
        // the type must be the correct one in the config.js file
        var device_instance = this.getdeviceobj(device.type, device.protocol);
        if (!device_instance) {
            throw new Error("Device type " + device.type + " is not implemented. Provide the correct configuration settings in the config.js file.");
        }

        var protocolhandler = this.protocol_handlers.get(device.protocol);
        return new device_instance(device.deviceid, device, protocolhandler.mcuhandler);
    }

    init() {
        try { 
            var conf = config.iot_config;
            if (!conf.run) {
                return logger.debug("Don't run IoT handler");
            }

            logger.info("Run IoT handler");

            // initialize the IoT device handlers Zigbee, Z-Wave, 6LowPan, etc.
            var protocols = conf.protocols;
            for (let i = 0; i < protocols.length; i++) {
                logger.info("create protocol " + protocols[i].name + " handler");
                let ProtocolHandler = require("libs/iot/protocols/" + protocols[i].name);
                let handler = new ProtocolHandler(protocols[i].name, protocols[i].chipset);
                this.protocol_handlers.set(protocols[i].name, handler);             
            };
         
            const devices = Devices.list();
            for (let i = 0; i < devices.length; i++) {
                let device = this.device_factory(devices[i]);
                this.setdevice(devices[i].deviceid, device);
                device.init();
            }

            // create the event handlers
            this.handle_events();

            // start the websocket server
            var port = conf.wsport ? conf.wsport : 32318;
            var wsserver = new WebSocket(port);
            wsserver.init();

            // initiaize the transports
            this.protocol_handlers.forEach(
                (handler, protocol) => {
                    try {
                        handler.init();
                    }
                    catch (err) {
                        logger.error("IoT " + protocol + " handler error: " + err.message);
                    }
                }
            );
        }
        catch (err) {
            logger.error("IoT handler error: " + err.message);
        }
    }


    device_list_response(deviceid, callback) {
        try {
            let devices = this.devicelist;
            let devicelist = [];
            devices.forEach(
                (device) => {
                    let info = device.get_device_info();
                    devicelist.push(info);
                }
            );

            var data = {
                payload: {
                    event: iotdefinitions.IOT_DEVICES_LIST_RESPONSE,
                    deviceid: deviceid,
                    devicelist: devicelist
                }
            };

            callback(null, data);

            //
        }
        catch (err) {
            if (callback) {
                callback(err.message);
            }
            logger.error("device_list_response() error: " + err.message);
        }
    }

    on_devices_comissioned(devices) {
        try {
            if (devices && devices.length) {
                devices.forEach(
                    (device) => {
                        if (device.permission == iotdefinitions.PERMISSION_ALLOWED) {
                            // the device has just been saved to the database some features must exists
                            device.setfeatures();
                            device.process_features();
                        }
                    }
                );
            }
        }
        catch (cerr) {
            logger.error("on_devices_comissioned() error: %j", cerr);
        }
    }

    device_list_configure(id, list, callback) {
        try {
            if (!list || !Array.isArray(list) || !list.length) {
                return callback("Empty list was submitted at device configuration");
            }

            var updatelist = [];
            for (let i = 0; i < list.length; i++) {
                let deviceid = list[i].deviceid;
                let permission = list[i].permission;
                let name = list[i].devicename;
                let featuretypes = list[i].features;
                // get the local device
                let localdevice = this.getdevice(deviceid);
                if (!localdevice) {
                    return callback("the device does not exists at the Devices manager.");
                }

                localdevice.permission = permission;                

                if (permission == iotdefinitions.PERMISSION_ALLOWED) {
                    localdevice.name = name;

                    if (!featuretypes || !Array.isArray(featuretypes) || !featuretypes.length) {
                        return callback("Empty feature list. Allowed devices must have some features.");
                    }
                    // set the features translate the integer feature type to device specific clusters (in case of Zigbee)
                    let features = localdevice.types_to_features(featuretypes);
                    let strfeatures = JSON.stringify(features);
                    localdevice.featuredef = strfeatures;
                }

                updatelist.push(localdevice);
            }

            // update the database
            async.eachSeries(
                updatelist,
                (device, asyncfn) => {
                    // update the device at the database
                    try {
                        Devices.update(device, asyncfn);
                    }
                    catch (asyncerr) {
                        asyncfn(asyncerr);
                    }
                },
                (err) => {
                    if (err) {
                        logger.error("device_list_configure error: %j", err);
                        return callback(err);                        
                    }

                    try {
                        // reply with the permitted devices
                        let allowed_devices = [];
                        this.devicelist.forEach(
                            (device) => {
                                if (device.permission == iotdefinitions.PERMISSION_ALLOWED) {
                                    // TODO get the features list correctly
                                    let info = device.get_device_info();
                                    allowed_devices.push(info);
                                }
                            }
                        );
                        var data = {
                            payload: {
                                deviceid: id,
                                devicelist: allowed_devices
                            }
                        };

                        // TODO features is empty here
                        callback(null, data);

                        // these devices has been just commissioned (approved), init the features, etc.
                        this.on_devices_comissioned(updatelist);

                    }
                    catch (cerr) {
                        logger.error("device_list_configure after complete error: %j", cerr);
                    }
                }
            );       

            //
        }
        catch (err) {
            if (callback) {
                callback(err.message);
            }
            logger.error("device_list_configure() error: " + err.message);
        }
    }

    create_device(payload) {
        // some device is joined already, create a device object for it
        let ieeeaddress = payload.address64;
        let nwkaddress = payload.address16;
        let protocol = payload.protocol;
        let mcu = payload.mcu;
        let protocol_handler = this.protocol_handlers.get(protocol);
        let transport = protocol_handler.mcuhandler;
        let device = {
            "type": constants.IOT_DEVICE_ENDDEVICE,
            "deviceid": ieeeaddress,
            "address64": ieeeaddress,
            "address16": nwkaddress,
            "protocol": protocol,
            "mcu": mcu,
            "permission": iotdefinitions.PERMISSION_NOT_COMISSIONED,
            "name": protocol + " device",
            "details": "",
            "features": ""
        }

        let zigbee_device = new ZigbeeDevice(ieeeaddress, device, transport);
        zigbee_device.on_data_received(payload);
        this.setdevice(device.deviceid, zigbee_device);
    }

    handle_events() {

        // events from Streembit users
        events.on(events.TYPES.ONIOTEVENT, (payload, callback) => {
            try {
                if (payload.event && payload.event == iotdefinitions.IOT_REQUEST_DEVICES_LIST ) {
                    this.device_list_response(payload.id, callback);
                }
                else if (payload.event && payload.event == iotdefinitions.IOT_DEVICES_LIST_CONFIGURE) {
                    this.device_list_configure(payload.id, payload.list, callback);
                }
                else {
                    var device = this.getdevice(payload.id);
                    if (!device) {
                        throw new Error("device for id " + id + " does not exists at the gateway");
                    }
                    device.executecmd(payload, callback);
                }
            }
            catch (err) {
                if (callback) {
                    callback(err.message);
                }
                logger.error("ONIOTEVENT error: " + err.message);
            }
        });

        // events from the protocol transports
        events.on(
            iotdefinitions.IOT_DATA_RECEIVED_EVENT,
            (payload) => {
                try {
                    if (payload.type == iotdefinitions.EVENT_GATEWAY_UPDATED) {
                        this.protocol_handlers.forEach(
                            (handler) => {
                                if (handler.on_gateway_updated && typeof handler.on_gateway_updated === "function") {
                                    handler.on_gateway_updated(payload);
                                }
                            }
                        );
                    }
                    else {
                        var device = this.getdevice(payload.deviceid);
                        if (device) {
                            device.on_data_received(payload);
                        }
                        else {
                            if (payload.type == iotdefinitions.EVENT_DEVICE_ANNOUNCE ||
                                payload.type == iotdefinitions.EVENT_DEVICE_ONLINE) {
                                this.create_device(payload);
                            }
                        }
                    }
                }
                catch (err) {
                    logger.error("IoTHandler IOT_DATA_RECEIVED_EVENT error: %j", err);
                }
            }
        );
    }
}

module.exports = IoTHandler; 

