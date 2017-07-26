'use strict';

const constants = require("libs/constants");
const Device = require("./device");
const events = require("libs/events");
const logger = require("libs/logger");

class SmartPlugDevice extends Device {

    constructor(id, device) {
        super(id, device);      

        this.last_switch_time = 0;
        this.last_switch_type = 0;

        logger.debug("initializing a switch device id: " + id);
    }

    on_device_active() {
        super.on_device_active();       

        // we want to receive notification about turning off/on the device

    }

}

module.exports = SmartPlugDevice;