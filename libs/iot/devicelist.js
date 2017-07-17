'use strict';

const config = require('libs/config');
const SwitchDevice = require('./devices/switch_device');
const logger = require('libs/logger');

const UNDEFINED = 0

var DeviceTypeMap = {
    1: SwitchDevice,
    2: UNDEFINED,
    3: UNDEFINED,
    4: UNDEFINED,
    5: UNDEFINED,
    6: UNDEFINED,
    7: UNDEFINED,
    8: UNDEFINED,
    9: UNDEFINED,
    10: UNDEFINED
};


var devicelist = (function (instance) {

    var map = new Map();

    instance.device_factory = function(device) {
        debugger;
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

