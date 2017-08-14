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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const events = require("libs/events");
const logger = require('libs/logger');
const constants = require("libs/constants");
const iotdefinitions = require("libs/iot/definitions");

class IoTReport {
    constructor(usersession, deviceid, interval) {
        if (!usersession) {
            throw new Error("IoTReport constructor error: invalid usersession");
        }
        this.usersession = usersession; // pkhash of the user, the WS object maps the WS connections to the pkhash

        if (!deviceid) {
            throw new Error("IoTReport constructor error: invalid deviceid");
        }
        this.deviceid = deviceid;

        this.interval = interval && (interval >= iotdefinitions.MIN_REPORTING_INTERVAL && interval <= iotdefinitions.MAX_REPORTING_INTERVAL) ? interval : iotdefinitions.MIN_REPORTING_INTERVAL;

        this.last_report_time = 0;
    }

    send(data) {
        try {
            if (data === null || data === undefined || !data.payload) {
                throw new Error("invalid report parameters");
            }

            var time = Date.now();
            var diff = time - this.last_report_time;
            if (diff > this.interval) {
                data.payload.deviceid = this.deviceid;
                events.emit(iotdefinitions.EVENT_PROPERTY_REPORT, this.usersession, data);
                //console.log("send report to " + this.deviceid);
            }
            this.last_report_time = time;
        }
        catch (err) {
            logger.error("IoTReport report() error: %j", err)
        }
    }
}


module.exports = IoTReport;