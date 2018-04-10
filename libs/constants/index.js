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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


var constants = {
    DEFAULT_TRANSPORT: "http",
    DEFAULT_WSTRANSPORT: "ws",
    DEFAULT_STREEMBIT_PORT: 32319,
    DEFAULT_WS_PORT: 32320,
    DEFAULT_WS_MAXCONN: 10000,
    USERTYPE_HUMAN: "human",
    USERTYPE_DEVICE: "device",
    KADNET: "kadnet",
    CLIENTNET: "clientnet",

    TASK_PUBLISHACCOUNT: "publish_account",
    TASK_INFORM_CONTACTS: "inform_contacts",

    DBSTREEMBIT: "streembit_database",
    DBACCOUNTS: "accounts_database",
    DBIOT: "iot_database",
    DBBCAPP: "bcapp_database",
    DBBLOCKS: "blocks_database",
    DBTXN: "txn_database",
    DBTEMP: "temp_database",

    RESPONSETIMEOUT: 10000,

    WSMODE_NONE: 0,
    WSMODE_SRVC: 1,
    WSMODE_IOT: 2,

    ONSENDTOWSCLIENT: "on_send_to_ws_client",
    ONCLIENTREQUEST: "on_client_request",
    ONSETDNS: "on_setdns"

};

module.exports = constants;