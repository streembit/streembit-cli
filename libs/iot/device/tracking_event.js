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

const DEFAULT_INTERVAL = 60000;

let instance = null;
let m_events = null;

class TrackingEvent {

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

    static insert(eventtype, deviceid, data, interval) {
        var index = -1;
        var eventitem = 0;
        for (var i = 0; i < TrackingEvent.events.length; i++) {
            var item = TrackingEvent.events[i];
            if (item.eventtype == eventtype && item.deviceid == deviceid && item.data.eventid == data.eventid) {
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
                deviceid: deviceid,
                data: data
            };
        }
        eventitem.time = Date.now();
        eventitem.interval = interval || DEFAULT_INTERVAL;

        TrackingEvent.events.push(eventitem);
    }

    static remove(eventid, deviceid) {
        var index = -1;
        var eventitem = 0;
        for (var i = 0; i < TrackingEvent.events.length; i++) {
            var item = TrackingEvent.events[i];
            if (item.deviceid == deviceid && item.data.eventid == data.eventid) {
                index = i;
                eventitem = item[i];
                break;
            }
        }
        if (index > -1) {
            TrackingEvent.events.splice(index, 1);
        }
    }


    static send(eventtype, deviceid, data, interval) {
        events.emit(eventtype, deviceid, data);
        TrackingEvent.events.insert(eventtype, deviceid, interval);
    }

    static monitor() {
        console.log("TrackingEvent monitor");
    }
}


module.exports = TrackingEvent;