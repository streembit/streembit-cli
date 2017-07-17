'use strict';

const Device = require("./device");

class SwitchDevice extends Device {

    constructor(id, device) {
        super(id, device);      

        this.last_switch_time = 0;
        this.last_switch_type = 0;

        console.log("creating a switch device");
    }

    on_device_active() {
        super.on_device_active()
    }

}

module.exports = SwitchDevice;