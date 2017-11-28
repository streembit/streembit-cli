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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

const constants = require("libs/constants");
const config = require("libs/config");
const logger = require("streembit-util").logger;
const events = require("streembit-util").events;
const util = require("util");
const Devices = require("libs/devices");
const ZigbeeGateway = require('libs/iot/device/zigbee/gateway');
const ZigbeeDevice = require('libs/iot/device/zigbee/device');
const TrackingEvent = require('libs/iot/device/tracking_event');
const iotdefinitions = require("libs/iot/definitions");
const async = require('async');


class IoTHandler {
    constructor() {
        this.protocol_handlers = new Map();
        this.devicelist = new Map();
        this.tracking_event = 0;
    }

    getdevice(id) {
        return this.devicelist.get(id);
    }

    setdevice(id, device) {
        this.devicelist.set(id, device);
    }

    getdeviceobj(type, protocol) {
        if (type == iotdefinitions.IOT_DEVICE_GATEWAY) {
            if (protocol == iotdefinitions.ZIGBEE) {
                return ZigbeeGateway;
            }
        }
        else if (type == iotdefinitions.IOT_DEVICE_ENDDEVICE) {
            if (protocol == iotdefinitions.ZIGBEE) {
                return ZigbeeDevice;
            }
        }
    }

    device_factory(device) {
        // the type must be the correct one in the config.js file
        let device_instance = this.getdeviceobj(device.type, device.protocol);
        if (!device_instance) {
            throw new Error("Device type " + device.type + " is not implemented. Provide the correct configuration settings in the config.js file.");
        }

        var protocolhandler = this.protocol_handlers.get(device.protocol);

        let deviceid = device.deviceid;
        if (!deviceid) {
            deviceid = device.id;
        }

        if (!deviceid) {
            throw new Error("Device factory error: invalid device ID");
        }

        return new device_instance(deviceid, device, protocolhandler.mcuhandler);
        
    }

    taskhandler() {
        setInterval(
            () => {
                // monitor events
                TrackingEvent.monitor();

                // call the protocols task handlers
                this.protocol_handlers.forEach(
                    (handler, protocol) => {
                        try {
                            handler.dotasks();
                        }
                        catch (err) {
                            logger.error("IoT handler dotasks error: " + err.message);
                        }
                    }
                );
            },
            5000
        );
    }

    init() {
        try { 
            var conf = config.iot_config;
            if (!conf.run) {
                return logger.debug("Don't run IoT handler");
            }

            logger.info("Run IoT handler");

            // create a tracking event handler to monitor event completions e.g. IOT_NEW_DEVICE_JOINED 
            this.tracking_event = new TrackingEvent();

            // initialize the IoT device handlers Zigbee, Z-Wave, 6LowPan, etc.
            var protocols = conf.protocols;
            for (let i = 0; i < protocols.length; i++) {
                logger.info("create protocol " + protocols[i].name + " handler");
                var ProtocolHandler = require("libs/iot/protocols/" + protocols[i].name);
                var handler = new ProtocolHandler(protocols[i].name, protocols[i].chipset);
                this.protocol_handlers.set(protocols[i].name, handler);             
            };
         
            let devices = Devices.list();
            for (let i = 0; i < devices.length; i++) {
                if (devices[i].permission == iotdefinitions.PERMISSION_DENIED) {
                    logger.debug("skip device " + devices[i].deviceid + " PERMISSION_DENIED");
                }
                else {
                    var device = this.device_factory(devices[i]);
                    this.setdevice(devices[i].deviceid, device);
                }
            }

            // create the event handlers
            this.handle_events();          

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

            // start the recurring tasks handler
            this.taskhandler();

            //
        }
        catch (err) {
            logger.error("IoT handler error: " + err.message);
        }
    }


    join_device(payload) {
        // some device is joined already, create a device object for it
        let id = payload.address64;
        if (!id) {
            console.log("join_device(payload) -> " + util.inspect(payload));
            return logger.error("IoT handler join_device() error: invalid device ID");
        }

        let protocol = payload.protocol;
        if (protocol == iotdefinitions.ZIGBEE) {
            let protocol_handler = this.protocol_handlers.get(protocol);
            let transport = protocol_handler.mcuhandler;
            let nwkaddress = payload.address16;

            let device = 0;
            // try to get the device from the database
            var dbdevice = Devices.get_device(id);
            if (dbdevice) {
                dbdevice.id = id;
                dbdevice.address64 = payload.address64;
                if (nwkaddress) {
                    dbdevice.address16 = nwkaddress;
                }
                device = dbdevice;
            }
            else {                
                let mcu = payload.mcu;
                device = {
                    "type": iotdefinitions.IOT_DEVICE_ENDDEVICE,
                    "deviceid": id,
                    "address64": payload.address64,
                    "address16": nwkaddress,
                    "protocol": protocol,
                    "mcu": mcu,
                    "permission": iotdefinitions.PERMISSION_NOT_COMISSIONED,
                    "name": protocol + " device",
                    "details": "",
                    "features": ""
                }
            }

            let zigbee_device = new ZigbeeDevice(id, device, transport);
            zigbee_device.on_data_received(payload);
            this.setdevice(device.deviceid, zigbee_device);
        }
        else if (protocol == iotdefinitions.ZWAVE) {
            // TODO
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

    send_all_devices(deviceid, callback) {
        try {
            let devices = Devices.list();
            devices.forEach(
                (device) => {
                    try {
                        let typeslist = [];
                        if (device.type == iotdefinitions.IOT_DEVICE_ENDDEVICE) {
                            if (device.features && typeof device.features == "string") {
                                let flist = JSON.parse(device.features);
                                if (!flist || !flist.length) {
                                    throw new Error("No features exist for device " + device.deviceid);
                                }

                                flist.forEach(
                                    (feature) => {
                                        let featuretype = iotdefinitions.ZIGBEE_CLUSTERMAP[feature];
                                        typeslist.push(featuretype);
                                    }
                                );
                                device.features = typeslist;
                            }
                        }
                    }
                    catch (e) {
                        throw new Error("JSON parse of features failed. Features must be a valid array. Error: " + e.message)
                    }
                }
            );

            var data = {
                payload: {
                    event: iotdefinitions.IOT_ALLDEVICES_LIST_RESPONSE,
                    deviceid: deviceid,
                    devicelist: devices
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

    delete_device(data, callback) {
        try {
            let gatewayid = data.id;
            let deviceid = data.payload.deviceid;
            logger.debug("delete device ID: " + deviceid);
            Devices.delete_device(
                deviceid,
                (err) => {
                    try {
                        if (err) {
                            logger.error("delete_device() error: %j", err);
                            return callback(err);
                        }                    
                        // return the set permission
                        let data = {
                            payload: {
                                gateway: gatewayid,
                                deviceid: deviceid,
                                isdeleted: true
                            }
                        };
                        callback(null, data);

                        // remove from the local list
                        this.devicelist.delete(deviceid);

                    }
                    catch (cerr) {
                        logger.error("delete_device error: %j", cerr);
                    }
                }
            );
        }
        catch (err) {
            callback(err);
            logger.error("delete_device() error: %j", cerr);
        }
    }


    enable_join(payload, callback) {
        try {
            var enabled = false;
            var gatewayid = payload.id;
            var interval = payload.interval;
            this.devicelist.forEach(
                (device) => {
                    if (device.type == iotdefinitions.IOT_DEVICE_GATEWAY && device.id == gatewayid) {
                        device.enable_join(interval);
                        enabled = true;
                    }
                }
            );
            if (enabled) {
                let data = {
                    payload: {
                        deviceid: gatewayid,
                        event: iotdefinitions.IOT_ENABLE_JOIN_RESPONSE,
                        interval: interval
                    }
                };
                callback(null, data);
            }
            else {
                callback("Enable join error, the device was not found.");
            }
        }
        catch (err) {
            callback(err);
            logger.error("enable_join() error: %j", err);
        }
    }

    send_gateway_details(payload, callback) {
        var protocol = payload.protocol;
        this.devicelist.forEach(
            (device) => {
                if (device.type == iotdefinitions.IOT_DEVICE_GATEWAY && device.protocol == payload.protocol) {
                    device.send_gateway_details(callback);
                }
            }
        );
    }

    on_device_allowed(deviceid) {
        try {
            // enable the gateway to accept devices
            this.devicelist.forEach(
                (device) => {
                    if (device.type == iotdefinitions.IOT_DEVICE_GATEWAY) {
                        device.enable_join();
                    }
                }
            );
            
            setTimeout(
                (err) => {
                    if (err) {
                        return logger.error("on_device_allowed() error: %j", err);
                    }

                    let device = this.getdevice(deviceid);
                    if (device) {
                        device.permission = iotdefinitions.PERMISSION_ALLOWED;
                        this.setdevice(deviceid, device);
                        device.init();
                    }
                    else{
                        // must exists in the database
                        device = Devices.get_device(deviceid);
                        if (!device) {
                            return logger.error("Device " + deviceid + " does not exists in the database.");
                        }
                        let deviceobj = this.device_factory(device);
                        this.setdevice(deviceid, deviceobj);
                        deviceobj.init();
                    }                  

                    //
                },
                2000
            ); 
        }
        catch (cerr) {
            logger.error("on_device_allowed() error: %j", cerr);
        }
    }

    on_device_denied(deviceid) {
        try {
            let device = this.getdevice(deviceid);
            device.permission = iotdefinitions.PERMISSION_DENIED;
            device.disjoin();
        }
        catch (cerr) {
            logger.error("on_device_denied() error: %j", cerr);
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

    set_device_permission(data, callback) {
        try {
            let gatewayid = data.id;
            let deviceid = data.payload.deviceid;
            let permission = data.payload.permission;
            Devices.set_device_permission(deviceid, permission,
                (err) => {
                    if (err) {
                        logger.error("set_device_permission() error: %j", err);
                        return callback(err);
                    }

                    try {
                        // return the set permission
                        let data = {
                            payload: {
                                gateway: gatewayid,
                                deviceid: deviceid,
                                permission: permission
                            }
                        };
                        callback(null, data);

                        
                        if (permission == iotdefinitions.PERMISSION_ALLOWED) {
                            // the device has been just commissioned (approved), init the features, etc.
                            this.on_device_allowed(deviceid);
                        }
                        else {
                            this.on_device_denied(deviceid);
                        }

                        // remove the tracking event if any
                        TrackingEvent.remove_event_bydevice(deviceid, iotdefinitions.IOT_NEW_DEVICE_JOINED);

                        //
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
            logger.error("device_list_response() error: " + err.message);
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

                // remove the tracking event if any
                TrackingEvent.remove_event_bydevice(deviceid, iotdefinitions.IOT_NEW_DEVICE_JOINED);

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

    handle_events() {

        // events from Streembit users
        events.register(
            events.ONIOTEVENT,
            (payload, callback) => {
                try {
                    switch (payload.event) {
                        case iotdefinitions.IOT_REQUEST_DEVICES_LIST:
                            this.device_list_response(payload.id, callback);
                            break
                        case iotdefinitions.IOT_DEVICES_LIST_CONFIGURE:
                            this.device_list_configure(payload.id, payload.list, callback);
                            break
                        case iotdefinitions.IOT_ALLDEVICES_LIST_REQUEST:
                            this.send_all_devices(payload.id, callback);
                            break
                        case iotdefinitions.IOT_SET_DEVICE_PERMISSION_REQUEST:
                            this.set_device_permission(payload, callback);
                            break
                        case iotdefinitions.IOT_ENABLE_JOIN_REQUEST:
                            this.enable_join(payload, callback);
                            break
                        case iotdefinitions.IOT_DELETE_DEVICE_REQUEST:
                            this.delete_device(payload, callback);
                            break
                        case iotdefinitions.EVENT_GATEWAY_DATA_REQUEST:
                            this.send_gateway_details(payload, callback);
                            break
                        default:
                            var device = this.getdevice(payload.id);
                            if (!device) {
                                throw new Error("device for id " + id + " does not exists at the gateway");
                            }
                            device.executecmd(payload, callback);
                            break;
                    }

                }
                catch (err) {
                    if (callback) {
                        callback(err.message);
                    }
                    logger.error("ONIOTEVENT error: " + err.message);
                }
            }
        );

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
                                this.join_device(payload);
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

