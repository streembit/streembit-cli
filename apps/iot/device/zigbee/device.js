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

const constants = require("libs/constants");
const iotdefinitions = require("apps/iot/definitions");
const Device = require("apps/iot/device/device");
const events = require("streembit-util").events;
const logger = require("streembit-util").logger;
const config = require("libs/config");
const util = require('util');
const async = require('async');
const zigbeecmd = require("apps/iot/protocols/zigbee/commands");
const TrackingEvent = require('apps/iot/device/tracking_event');

class ZigbeeDevice extends Device {

    constructor(id, device, transport) {
        try {
            // call the base class
            super(id, device, transport);           

            if (device.details && (typeof device.details != "string") &&
                device.details.hasOwnProperty("address64") && device.details.hasOwnProperty("address16") &&
                device.details.hasOwnProperty("descriptors")) {
                // this is being initialzing from an existing ZigbeeDevice object
                this.details.address64 = device.details.address64 || 0;
                this.details.address16 = device.details.address16 || 0;
                this.details.descriptors = device.details.descriptors || 0;     
            }

            if (!this.details.address64) {
                this.details.address64 = device.address64 || 0;
            }

            if (!this.details.address16) {
                this.details.address16 = device.address16 || 0;
            }

            this.details.descriptors = new Map();

            logger.debug("Initialized Zigbee device id: " + id );
        }
        catch (err) {
            throw new Error("IoTEndDevice constructor error: " + err.message);
        }
    }

    is_feature_handled(feature) {
        let num = iotdefinitions.ZIGBEE_CLUSTERMAP[feature]; 
        return num > 1;
    }

    get_feature_type(feature) {
        return iotdefinitions.ZIGBEE_CLUSTERMAP[feature]; // maps the Zigbee cluster to our generic feature type
    }

    get_feature_name(feature_type) {
        return iotdefinitions.FEATURETYPEMAP[feature_type]; // maps the Zigbee feature type to a name
    }

    types_to_features(types) {
        var features = [];
        for (let i = 0; i < types.length; i++) {
            let val = iotdefinitions.ZIGBEE_TYPEMAP[types[i]];
            if (val && typeof val == "string")  {
                features.push(val);
            }
        }
        return features;
    }

    on_device_online(payload) {
        this.details.address64 = payload.address64;
        this.details.address16 = payload.address16;
        logger.debug("on_device_online() ZigbeeDevice address64: " + this.details.address64 + " address16: " + this.details.address16 + " online");

        // set to active
        this.active = true;

        // call the device online event handler of each features
        this.features.forEach((feature, key, map) => {
            feature.on_device_online(payload);
        });

        // send a ZDO 0x0005 "Active Endpoint Request"
        var cmd = zigbeecmd.active_endpoint_request(this.details.address64, this.details.address16);
        this.transport.send(cmd);

        //
    }

    on_report_configured(payload) {
        try {
            // call the device online event handler of each features
            this.features.forEach((feature, key, map) => {
                feature.on_report_configured(payload);
            });            
        }
        catch (err) {
            logger.error("on_device_announce() error: %j", err);
        }
    }

    on_device_announce(payload) {
        try {
            if (this.permission == iotdefinitions.PERMISSION_DENIED) {
                return this.disjoin();
            }

            this.details.address64 = payload.address64;
            this.details.address16 = payload.address16;
            logger.debug("Device announce: " + this.id + " address16: " + this.details.address16);

            // call the device online event handler of each features
            this.features.forEach((feature, key, map) => {
                feature.on_device_online(payload);
            });

            // set to active
            this.active = true;

            if (this.details.endpoints && this.details.descriptors.size > 0) {
                // the endpoints are exists, just set the NWKaddress and bind
                var properties = {
                    address64: this.details.address64,
                    address16: this.details.address16
                };
                this.features.forEach((feature, key, map) => {
                    feature.on_device_announce(properties);
                });
            }
            else {
                logger.debug("Device joined " + this.id);

                // wait a bit for a 0x0006 request

                // send a ZDO 0x0005 "Active Endpoint Request"
                var cmd = zigbeecmd.active_endpoint_request(this.details.address64, this.details.address16);
                this.transport.send(cmd);
            }
        }
        catch (err) {
            logger.error("on_device_announce() error: %j", err);
        }
    }

    on_endpoint_receive(payload) {
        if (!payload || !payload.endpoints) {
            return;
        }

        this.active = true;

        this.details.endpoints = payload.endpoints;
        logger.debug("ZigbeeDevice " + this.id + " endpoints: " + util.inspect(this.details.endpoints));

        async.eachSeries(
            payload.endpoints,
            (endpoint, callback) => {
                // send a ZDO 0x0004 Simple Descriptor Request
                var cmd = zigbeecmd.simple_descriptor_request(this.details.address64, this.details.address16, endpoint);
                this.transport.send(cmd);
                callback();
            },
            (err) => {
                if (err) {
                    logger.error("ZigbeeDevice on_endpoint_receive() async.eachSeries() simple_descriptor_request error: %j", err)
                }
            }
        );       
    }

    select_endpoint(cluster) {
        var endpoint = null; 
        this.details.descriptors.forEach(
            (clusters, endpoint_keyval) => {
                for (let i = 0; i < clusters.length; i++) {
                    if (cluster == clusters[i]) {
                        endpoint = endpoint_keyval;
                    }
                }
            }
        );

        return endpoint;
    }

    process_features() {
        if (this.permission == iotdefinitions.PERMISSION_DENIED) {
            // don't perform the binding and reporting in case the device permission is not sufficient
            logger.error("ZigbeeDevice process_features() called with no permission.")
            return;
        }

        var properties = {
            address64: this.details.address64,
            address16: this.details.address16
        };

        this.features.forEach((feature, key, map) => {
            // make sure the NWKadress is set
            feature.on_device_online(properties);

            let cluster = feature.cluster;
            let endpoint = this.select_endpoint(cluster);
            if (endpoint == null || endpoint < 0) {
                return logger.error("process_features() error: endpoint is not available for cluster " + cluster);
            }
       
            feature.on_clusterlist_receive(endpoint);

            //
        });
    }

    on_clusterlist_receive(payload) {
        logger.debug("Cluster list received for " + this.id);

        this.active = true;

        if (payload && payload.descriptor && payload.descriptor.endpoint && payload.descriptor.clusters) {
            // add the cluster list to the map
            this.details.descriptors.set(payload.descriptor.endpoint, payload.descriptor.clusters);

            this.active = true;
            this.verifyfeatures(payload.descriptor.clusters);

            this.process_features();

            // try to get the device info 
            if (payload.descriptor.clusters.indexOf("0000") > -1) {
                // get the device info
                var attributes = [0x03, 0x00, 0x04, 0x00, 0x05, 0x00];
                var cmd = zigbeecmd.readAttributes(this.details.address64, this.details.address16, 0x0000, attributes, payload.descriptor.endpoint);
                this.transport.send(cmd);
            }
        }
    }

    get_device_info() {
        var features = [];
        if (this.permission == iotdefinitions.PERMISSION_NOT_COMISSIONED) {
            // translate the descriptors to our feature types in case of not comissioned devices
            this.details.descriptors.forEach(
                (clusters, endpoint) => {
                    for (let i = 0; i < clusters.length; i++) {
                        let val = iotdefinitions.ZIGBEE_CLUSTERMAP[clusters[i]];
                        if (val > 0) {
                            features.push(val);
                        }
                    }
                }
            );
        }
        else if (this.permission == iotdefinitions.PERMISSION_ALLOWED) {
            features = this.featuretypes;
        }

        var data = {
            deviceid: this.id,
            type: this.type,
            protocol: this.protocol,
            network: iotdefinitions.IOT_NETWORK_ZIGBEE,
            address64: this.details.address64,
            address16: this.details.address16,
            hwversion: this.details.hwversion || "",
            manufacturername: this.details.manufacturername || "",
            modelidentifier: this.details.modelidentifier || "",
            permission: this.permission,
            name: this.name,
            features: features
        };
        return data;
    }

    notify_device_info() {       

        logger.debug("notify_device_info() send EVENT_GATEWAY_DATA_REQUEST");

        var payload = {
            event: iotdefinitions.EVENT_GATEWAY_DATA_REQUEST,
            protocol: iotdefinitions.ZIGBEE
        }
        events.iotmsg(
            payload,
            (gateway) => {
                let gatewayid = gateway.id;
                var deviceinfo = this.get_device_info();
                let data = {                    
                    payload: {
                        event: iotdefinitions.IOT_NEW_DEVICE_JOINED,
                        gateway: gatewayid,
                        device: deviceinfo
                    }
                };
               
                logger.debug(`notify_device_info TrackingEvent.send event IOT_NEW_DEVICE_JOINED gateway:${gatewayid} deviceinfo: ${util.inspect(deviceinfo)}`);

                TrackingEvent.send(iotdefinitions.EVENT_NOTIFY_USERS, gatewayid, data);
            }
        );    
       
        //
    }

    on_device_info_completed() {
        try {
            logger.debug("Device info completed for " + this.id);

            if (this.permission == iotdefinitions.PERMISSION_NOT_COMISSIONED) {
                // ask the user if the device is permitted
                this.notify_device_info();
                //
            }
            //else if (this.permission == iotdefinitions.PERMISSION_ALLOWED) {
            //    this.active = true;
            //    this.process_features();
            //}

            //
        }
        catch (err) {
            logger.error("on_device_info_completed() error: %j", err);
        }
    }

    on_device_info(payload) {
        if (payload && payload.properties) {
            for (var property in payload.properties) {
                this.details[property] = payload.properties[property];
                console.log(property + ":" + this.details[property]);
            }
        }

        this.on_device_info_completed();
    }

    on_data_received(payload) {
        if (!payload || !payload.type) {
            return;
        }

        try {
            //console.log("ZigbeeDevice on_data_received payload.type: " + payload.type);
            if (payload.type == iotdefinitions.EVENT_RADIO_ERROR && payload.error) {
                this.errors.push(payload.error);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ANNOUNCE) {
                this.on_device_announce(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ONLINE) {
                this.on_device_online(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ENDPOINTSRCV) {
                this.on_endpoint_receive(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_CLUSTERSRCV) {
                this.on_clusterlist_receive(payload);    
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_INFO) {
                this.on_device_info(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_REPORT_CONFIGURED) {
                this.on_report_configured(payload);
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_BINDSUCCESS) {
                this.features.forEach((feature, key, map) => {
                    if (feature.iscluster(payload.cluster)) {
                        feature.on_bind_complete();
                    }
                });
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_CONTACTING) {
                console.log("+++++++++ EVENT_DEVICE_CONTACTING")
                this.set_property_item(payload.devicedetails);

                // this is a ZDO 0x0006 Match Descriptor Request 
                // reply with Cluster ID: 0x8006 permit we support the cluster

            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_PROPERTY_UPDATE) {
                this.set_property_item(payload.properties);
            }
            else if (payload.type == iotdefinitions.EVENT_FEATURE_PROPERTY_UPDATE && payload.properties && Array.isArray(payload.properties) && payload.properties.length) {
                var propnames = [];
                payload.properties.forEach(
                    (prop) => {
                        propnames.push(prop.property);
                    }
                );
                this.features.forEach((feature, key, map) => {
                    if (feature.is_property_handled(propnames)){
                        feature.on_datareceive_event(payload.properties);
                    }
                });
            }
        }
        catch (err) {
            logger.error("Device on_data_received() error. Payload type: " + payload.type + " error msg: %j", err);
        }
    }

    enable_join() {
    }

    disjoin() {
        // send a ZDO 0x0034
        logger.debug("Levase request to " + this.details.address64);
        var cmd = zigbeecmd.mgmtLeaveRequesteq(this.details.address64, this.details.address16);
        this.transport.send(cmd);

        // set to inactive
        this.active = false;
    }

    propread() {
        logger.debug("Device " + this.id + " create propread event handler");

        events.on(
            "feature_property_read_request",
            () => {
                this.features.forEach(
                    (obj, key) => {
                        try {
                            obj.propread();
                        }
                        catch (err) {
                            logger.error(`device  propread() error: ${err.message}`);
                        }
                    }
                );
            }
        );
    }

    init() {
        try {
            // set to inactive
            this.active = false;

            this.propread();

            logger.debug("Net address request to " + this.id);
            let cmd = zigbeecmd.netAddressRequest(this.id);
            this.transport.send(cmd);

            
            setTimeout(
                () => {
                    logger.debug("Set gateway id for the features at " + this.id);
                    var payload = {
                        event: iotdefinitions.EVENT_GATEWAY_DATA_REQUEST,
                        protocol: iotdefinitions.ZIGBEE
                    }
                    events.iotmsg(
                        payload,
                        (gateway) => {
                            this.features.forEach(
                                (obj, key) => {
                                    try {
                                        obj.gatewayid = gateway.id;
                                        logger.debug(`IoTFeature type ${obj.type} at device ${obj.deviceid} set gateway id: ${gateway.id}`);
                                    }
                                    catch (err) {
                                        logger.error(`device  set feature gateway id error: ${err.message}`);
                                    }
                                }
                            );
                        }
                    );    
                },
                100
            );           

            let isactive_timer = setInterval(
                () => {
                    if (this.active) {
                        clearInterval(isactive_timer);
                        return;
                    }

                    this.transport.send_rtg_request();

                    //
                },
                10000
            );
        }
        catch (err) {
            throw new Error("Device init error: " + err.message);
        }
    }

}

module.exports = ZigbeeDevice;