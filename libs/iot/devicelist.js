'use strict';

const constants = require('libs/constants');
const config = require('libs/config');
const GatewayDevice = require('./devices/gateway_device');
const SwitchDevice = require('./devices/switch_device');
const SmartPlug = require('./devices/smartplug_device');
const logger = require('libs/logger');

const UNDEFINED = 0

var DeviceTypeMap = {
    1: GatewayDevice,
    2: SwitchDevice,
    3: SmartPlug,
    4: UNDEFINED,
    5: UNDEFINED,
    6: UNDEFINED,
    7: UNDEFINED,
    8: UNDEFINED,
    9: UNDEFINED,
    10: UNDEFINED,
    11: UNDEFINED,
    12: UNDEFINED,
    13: UNDEFINED,
    14: UNDEFINED,
    15: UNDEFINED,
    16: UNDEFINED,
    17: UNDEFINED,
    18: UNDEFINED,
    19: UNDEFINED,
    20: UNDEFINED
};


var devicelist = (function (instance) {

    var map = new Map();

    instance.device_factory = function(device) {
        //debugger;
        // the type must be the correct one in the config.js file
        var device_instance = DeviceTypeMap[device.type];
        if (!device_instance) {
            throw new Error("Device type " + device.type + " is not implemented. Provide the correct configuration settings in the config.js file.");
        }

        return new device_instance(device.id, device);
    }


    instance.update = function (id, active) {
        if (map.has(id)) {
            logger.debug("active device detected: " + id);
            var item = map.get(id);
            item.active = active;
        }
    };

    instance.get = function(id) {
        var item = map.get(id);
        return item;
    }

    instance.get_gateway = function() {
        var item = 0;
        myMap.forEach(function(value, key) {
            if (value.type == 1) {
                item = value;
            }
        });
        return item;
    }

    instance.init = function () {
        // crate the device list
        var devices = config.iot_config.devices;
        devices.forEach(function(device) {
            var device_obj = instance.device_factory(device);
            map.set(device.id, device_obj);
        });
    }

    return instance;

}({}));


module.exports = devicelist;

