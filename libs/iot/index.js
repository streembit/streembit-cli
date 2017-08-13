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
const Database = require("libs/database/devicesdb");
const util = require("util");

class IoTHandler {
    constructor() {
        this.protocol_handlers = new Map();
        this.device_protocol_map = new Map();
    }

    get_handler_by_id(id) {
        if (!id) {
            throw new Error("invalid device ID");
        }

        var protocol = this.device_protocol_map.get(id);
        if (!protocol) {
            throw new Error("protocol for id " + id + " does not exists");
        }

        var handler = this.protocol_handlers.get(protocol);
        if (!handler) {
            throw new Error("handler for protocol " + protocol + " does not exists");
        }

        return handler;
    }

    async device_to_db(database, device) {

        function feature_indb(dbfeatures, conf) {
            if (!dbfeatures) {
                return false;
            }

            var exists = false;
            dbfeatures.forEach(
                (item) => {
                    if (conf.type == item.type) {
                        exists = true;
                    }
                }
            );
            return exists;
        }

        try {
            let dbrow = await database.get_device(device.id);
            if (!dbrow) {
                // add to database
                let deviceid = device.id,
                    type = device.type,
                    protocol = device.protocol,
                    mcu = device.mcu,
                    details = device.details ? JSON.stringify(device.details) : null;
                await database.add_device(deviceid, type, protocol, mcu, details);
                dbrow = await database.get_device(device.id);
            }

            // get all features
            let conf_features = device.features;
            if (conf_features) {
                let devrowid = dbrow.devrowid;
                let features = await database.get_features_by_devicerowid(devrowid);
                for (let i = 0; i < conf_features.length; i++) {
                    var isadded = feature_indb(features, conf_features[i]);
                    if (!isadded) {
                        let type = conf_features[i].type,
                            clusters = conf_features[i].clusters ? JSON.stringify(conf_features[i].clusters) : null,
                            settings = conf_features[i].settings ? JSON.stringify(conf_features[i].settings) : null;
                        await database.add_feature(devrowid, type, clusters, settings);
                        //console.log("feature added to DB: " + util.inspect(conf_features[i]));
                    }
                }
            }
        }
        catch (err) {
            logger.error("Device to DB error: " + err.message);
        }
    }

    async populate_db(database, conf) {       
        try {            
            var devices = conf.devices;
            for (let i = 0; i < devices.length; i++) {
                await this.device_to_db(database, devices[i]);                
            }
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(new Error(err.message));
        }
    }

    async init_protocol(handler) {
        if (!handler.init) {
            return Promise.reject(new Error("handler does not exists"));
        }

        try {
            await handler.init();
            return Promise.resolve();            
        }
        catch (err) {
            return Promise.reject(new Error(err.message));
        }         
    }

    async init() {
        try {
            //debugger;
            var conf = config.iot_config;
            if (!conf.run) {
                return logger.debug("Don't run IoT handler");
            }

            logger.info("Run IoT handler");

            var database = new Database();

            // make sure the database is operational and all devices are in the database 
            try {
                const dbresult = await this.populate_db(database, conf);
            }
            catch (err) {
                throw new Error("IOT handler init populate_db() error: " + err.message);
            }

            try {
                const devices = await database.get_devices();
                for (let i = 0; i < devices.length; i++) {
                    this.device_protocol_map.set(devices[i].deviceid, devices[i].protocol);
                }
            }
            catch (err) {
                throw new Error("IOT handler init database.get_devices() error: " + err.message);
            }            
            
            // initialize the IoT device handlers Zigbee, Z-Wave, 6LowPan, etc.
            var protocols = conf.protocols;
            for (let i = 0; i < protocols.length; i++) {
                logger.info("create protocol " + protocols[i].name + " handler");
                var ProtocolHandler = require("libs/iot_protocols/" + protocols[i].name);
                var handler = new ProtocolHandler(protocols[i].name, protocols[i].chipset);
                try {
                    const result = await this.init_protocol(handler);
                    this.protocol_handlers.set(protocols[i].name, handler);
                }
                catch (err) {
                    throw new Error(protocols[i].name + " protocol handler error: " + err.message);
                }                
            };

            // create the event handlers
            this.handle_events();

            // start the websocket server
            var port = conf.wsport ? conf.wsport : 32318;
            var wsserver = new WebSocket(port);
            wsserver.init();

        }
        catch (err) {
            logger.error("IoT handler error: " + err.message);
        }
    }

    handle_events() {
        events.on(events.TYPES.ONIOTEVENT, (event, payload, callback) => {
            try {
                switch (event) {
                    case constants.IOTREQUEST:
                        var handler = this.get_handler_by_id(payload.id);
                        if (!handler && !handler.handle_request) {
                            throw new Error("invalid IOTREQUEST handler");
                        }
                        handler.handle_request(payload, callback);
                        break;
                    default:
                        throw new Error("IOTREQUEST " + event + " handler is not implemented");
                }
            }
            catch (err) {
                if (callback) {
                    callback(err.message);
                }
                logger.error("ONIOTEVENT error: " + err.message);
            }
        });
    }
}

module.exports = IoTHandler; 

