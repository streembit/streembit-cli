'use strict';

const constants = require("libs/constants");
const Device = require("./device");
const events = require("libs/events");
const logger = require("libs/logger");

class GatewayDevice extends Device {

    constructor(id, device) {
        super(id, device);      

        this.last_switch_time = 0;
        this.last_switch_type = 0;

        logger.debug("initializing a gateway device id: " + id);
    }

    on_device_active() {
        super.on_device_active();        
    }

}

module.exports = GatewayDevice;