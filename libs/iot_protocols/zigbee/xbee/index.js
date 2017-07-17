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

function toggle(remote64) {
    logger.debug("toggle " + remote64);
    var txframe = { 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: remote64,
        destination16: 'fffe', //'e429',
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x01,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x01, 0x01, 0x02]
    };

    serialport.write(xbee.buildFrame(txframe));
}

module.exports.executecmd = function(payload) {
    var cmd = payload.cmd;
    switch (cmd) {
        case "toggle":
            toggle(payload.remote64);
            break;
        default:
            break;
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
                    data: [0x12, 0x01]
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
            ////console.log("OBJ " + util.inspect(frame));
            //console.log("type: " + frame.type);

            if (frame.command == "NI" && frame.commandData && Buffer.isBuffer(frame.commandData)) {
                logger.debug("Zigbee NI: " + frame.commandData.toString());
            }

            //if (frame.clusterId == "8032") {
                //console.log(util.inspect(frame));
                //console.log("long_address: %s short_address: %s source_endpoint: %s destionation_endpoint: %s", frame.remote64, frame.remote16, frame.sourceEndpoint, frame.destinationEndpoint);
                //if (frame.remote64 && frame.remote64.toUpperCase() == "000D6F000BBC50B6") {
                //configure_report(frame.remote64, frame.remote16, frame.sourceEndpoint, frame.destinationEndpoint);
                //}

                //conf.iot.devices.forEach(function (item) {
                //if (frame.remote64 && frame.remote64.toLowerCase() == item.mac.toLowerCase()) {
                //    devicemap.set(item.mac.toLowerCase(),
                //        {
                //        }
                //    );
                //}
                //console.log("device found");
                //});
            //}

            ////if (frame.type == 139) {
            ////    console.log(util.inspect(frame));
            ////}

            //if (frame.type == 145) {
            //    console.log(util.inspect(frame));
            //}

            //console.log(util.inspect(frame));

            if (frame.clusterId == "8032") {
                //console.log(util.inspect(frame));
                if (frame.remote64 && typeof frame.remote64 == 'string') {
                    //var mac = frame.remote64.toLowerCase();
                    //devicelist.update(mac, true);
                    events.emit(
                        events.TYPES.ONIOTEVENT,
                        constants.ACTIVE_DEVICE_FOUND,
                        {
                            id: frame.remote64
                        }
                    );
                }
            }
        }
    }
    catch (err) {
        console.log("on frame_object error: ", err);
    }
});


