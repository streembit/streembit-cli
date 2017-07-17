'use strict';

const events = require("libs/events");
const logger = require('libs/logger');

class Device {

    constructor(id, device) {
        this.id = id;
        this.type = device.type;
        this.protocol = device.protocol;
        this.profile = device.profile;
        this.settings = device.settings;

        this.m_active = false;
    }

    get_report() {
        //events.emit(events.TYPES.ONIOTCMD, "report", function (err, data) {
        //    if (err) {
        //        //TODO
        //        return 0;
        //    }

        //    events.emit(events.TYPES.ONIOTSEND, "report", function () {

        //    });
        //});
    }

    on_device_active() {
        logger.debug("on_device_active");
        //events.emit(events.TYPES.ONDEVICECMD);
    }

    get active() {
        return this.m_active;
    }

    set active(value) {
        this.m_active = value;
        if (value == true) {
            this.on_device_active();
        }
    }
    
}


module.exports = Device;