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

const xbeeapi = require('./xbeeapi');
const util = require('util');
const SerialPort = require('serialport');
const logger = require('libs/logger');
const config = require('libs/config');
const events = require("libs/events");
const constants = require("libs/constants");

var C = xbeeapi.constants;

var xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});


var serialport = 0;
var pending_task = {};

function add_pending_task(txid, callback) {
    pending_task[txid] = callback;
}

function delete_pending_task(txid) {
    delete pending_task[txid];
}


function read_switchstatus(remote64, callback) {
    logger.debug("read_switchstatus");

    var txid = 0xab;
    var txframe = { 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: remote64,
        destination16: 'fffe', 
        sourceEndpoint: 0x00, 
        destinationEndpoint: 0x01, 
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x00, txid, 0x00, 0x00, 0x00]
    };

    var result = {
        payload: {
            switch_status: -1  // -1 = unknown, default
        }
    }; 
    var timer = 0
    var current = 0;
    // create a pending task for it
    add_pending_task(
        txid,
        function (data) {
            clearTimeout(timer);
            delete_pending_task(txid);

            if (data && data.length && (data[data.length-1] == 0x00 || data[data.length-1] == 0x01)) {
                result.payload.switch_status = data[data.length-1]; // the last byte is the switch status
            }

            callback(null, result);
        }
    );

    timer = setTimeout(
        function () {
            delete_pending_task(txid);
            result.payload.switch_status = -2; // -2 = timed out
            callback(null, result);
        },
        2000
    );    

    serialport.write(xbee.buildFrame(txframe));
}

function toggle(remote64) {
    logger.debug("toggle " + remote64);
    var txframe = { 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: remote64,
        destination16: 'fffe',
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x01,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x01, 0x01, 0x02]
    };

    serialport.write(xbee.buildFrame(txframe));
}

function toggle_handler(id, callback) {
    // toggle the switch 
    toggle(id);

    // get the switch status
    read_switchstatus(id, function (err, result) {
        //console.log(result);
        callback(err, result);
    }); 
}

function cmd_handler(payload, callback) {
    switch (payload.cmd) {
        case 0x02:
            toggle_handler(payload.id, callback);
            break;
        case 0x04:
            read_switchstatus(payload.id, callback);
            break;
        default:
            callback("invalid command");
            break;
    }
}


module.exports.handle_request = function(payload, callback) {
    try {
        if (!payload) {
            return callback("invalid request data");
        }

        if (payload.cmd) {
            cmd_handler(payload, callback);
        }
        else {
            callback("invalid request data, command is required");
        }
    }
    catch (err) {
        callback(err);
    }
}


module.exports.init = function init() {

    var port = config.iot_config.serialport;
    logger.debug("xbee init(), try open serial port: " + port);

    serialport = new SerialPort(
        port,
        {
            baudrate: 9600
        },
        function(err) {
            if (err) {
                console.log('Serial port error: ', err.message);
            }
        }
    );

    serialport.on("open", function(err) {
        if (err) {
            return console.log('Error opening port: ', err.message);
        }

        logger.debug('serial port ON open');
        

        // get the NI
        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.AT_COMMAND,
            command: "NI",
            commandParameter: [],
        };

        serialport.write(xbee.buildFrame(txframe));

        //
        // send "Management Rtg (Routing Table) Request" 0x0032
        //
        setTimeout(
            function() {
                txframe = { // AT Request to be sent to 
                    type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
                    clusterId: 0x0032,
                    profileId: 0x0000,
                    data: [0x01, 0x00]
                };

                serialport.write(xbee.buildFrame(txframe));
            },
            1000
        );

    });


    serialport.on("data", function(data) {
        xbee.parseRaw(data);
    });
}

xbee.on("frame_object", function(frame) {
    try {
        if (frame) {

            if (frame.clusterId == "8032" && frame.remote64 && typeof frame.remote64 == 'string') {
                //console.log(util.inspect(frame));
                events.emit(
                    events.TYPES.ONIOTEVENT,
                    constants.IOTACTIVITY,
                    {
                        type: constants.ACTIVE_DEVICE_FOUND,
                        id: frame.remote64
                    }
                );                
            }
            else if (frame.data && frame.clusterId == "0006" ) {
                var txid = frame.data[1];
                var callback = pending_task[txid];
                if (callback) {
                    // the callback will parse it
                    callback(frame.data);
                }
            }
        }
    }
    catch (err) {
        console.log("on frame_object error: ", err);
    }
});


module.exports.executecmd = cmd_handler;