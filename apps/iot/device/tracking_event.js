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

import { logger, events } from "streembit-util";

const DEFAULT_INTERVAL = 60000;

let instance = null;
let m_events = null;

export class TrackingEvent {

    constructor() {
        if (!instance) {
            instance = this;
            m_events = new Array();
        }
        return instance;
    }

    static get events() {
        return m_events;
    }

    static insert(eventtype, gatewayid, data, interval) {
        let index = -1;
        let eventitem = 0;
        for (let i = 0; i < TrackingEvent.events.length; i++) {
            let item = TrackingEvent.events[i];
            if (item.eventtype == eventtype && item.gatewayid == gatewayid && item.data.payload.event == data.payload.event) {
                index = i;
                eventitem = item[i];
                break;
            }
        }
        if (index > -1) {
            TrackingEvent.events.splice(index, 1);
        }

        if (!eventitem) {
            eventitem = {
                eventtype: eventtype,
                gatewayid: gatewayid,
                data: data
            };
        }
        eventitem.time = Date.now();
        eventitem.interval = interval || DEFAULT_INTERVAL;

        TrackingEvent.events.push(eventitem);
    }

    static remove_event_bydevice(deviceid, eventid) {
        try {
            //console.log("remove tracking event: " + eventid + ", deviceid: " + deviceid)
            let index = -1;
            for (let i = 0; i < TrackingEvent.events.length; i++) {
                let item = TrackingEvent.events[i];
                if (item.data && item.data.payload &&
                    item.data.payload.device && item.data.payload.device.deviceid == deviceid &&
                    item.data.payload.event == eventid) {
                    index = i;
                    break;
                }
            }
            if (index > -1) {
                TrackingEvent.events.splice(index, 1);
                logger.debug("removing TrackingEvent event: " + eventid + ", deviceid: " + deviceid);
            }
        }
        catch (err) {
            logger.error("TrackingEvent remove_event_bydevice() error: %j", err);
        }
    }

    static remove(eventtype, gatewayid, eventid) {
        console.log("remove tracking event type: " + eventtype + ", event: " + eventid + ", gateway: " + gatewayid)
        let index = -1;
        for (let i = 0; i < TrackingEvent.events.length; i++) {
            let item = TrackingEvent.events[i];
            if (item.eventtype == eventtype && item.gatewayid == gatewayid && item.data.payload.event == eventid) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            TrackingEvent.events.splice(index, 1);
            logger.debug("removing TrackingEvent type: " + eventtype + ", event: " + eventid + ", gateway: " + gatewayid);
        }
    }

    static send(eventtype, gatewayid, data, interval) {
        if (!eventtype) {
            throw new Error("Invalid tracking event, eventtype required.");
        }
        if (!gatewayid) {
            throw new Error("Invalid tracking event, gatewayid required.");
        }
        if (!data || !data.payload) {
            throw new Error("Invalid tracking event, data and data.payload required.");
        }
        if (!data.payload.event) {
            throw new Error("Invalid tracking event, payload event required.");
        }

        logger.debug("sending TrackingEvent type: " + eventtype + ", event: " + data.payload.event + ", gateway: " + gatewayid);
        events.emit(eventtype, gatewayid, data);
        TrackingEvent.insert(eventtype, gatewayid, data, interval);
    }

    static monitor() {
        try {
            //console.log("TrackingEvent monitor");
            let currtime = Date.now();
            for (let i = 0; i < TrackingEvent.events.length; i++) {
                let item = TrackingEvent.events[i];
                if ((currtime - item.time) > item.interval) {
                    // resend 
                    let eventtype = item.eventtype, gatewayid = item.gatewayid, data = item.data, interval = item.interval;
                    TrackingEvent.send(eventtype, gatewayid, data, interval);
                }
            }
        }
        catch (err) {
            logger.error("TrackingEvent monitor error: %j", err);
        }
    }
}

