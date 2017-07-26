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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


var constants = {
    DEFAULT_STREEMBIT_PORT: 32320,
    DEFAULT_TRANSPORT: "http",
    USERTYPE_HUMAN: "human",
    USERTYPE_DEVICE: "device",
    KADNET: "kadnet",
    CLIENTNET: "clientnet",

    TASK_PUBLISHACCOUNT: "publish_account",
    TASK_INFORM_CONTACTS: "inform_contacts",

    RESPONSETIMEOUT: 10000,

    // IOT constants
    // device types
    IOT_DEVICE_GATEWAY: 1,
    IOT_DEVICE_SWITCH: 2,
    IOT_DEVICE_SMARTPLUG: 3,
    IOT_DEVICE_MOTIONSENSOR: 4,
    IOT_DEVICE_TEMPHUMSENSOR: 5,

    IOTREQUEST: "iotrequest",
    IOTCMD: "iotcmd",
    IOTACTIVITY: "iotactivity",
    // activity types
    ACTIVE_DEVICE_FOUND: "active_device_found",

    IOT_STATUS_UNKOWN: -1,

    IOT_ERROR_TIMEDOUT: -2

};

module.exports = constants;