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

var C = xbeeapi.constants;

var xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

var port = config.iot_config.serialport;

function init() {

    logger.debug("xbee init(), try open serial port: " + port);

    var serialport = new SerialPort(
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

            //if (frame.clusterId == "8032") {
            //    if (frame.remote64 && typeof frame.remote64 == 'string') {
            //        var mac = frame.remote64.toLowerCase();
            //        devicelist.update(mac, true);
            //    }
            //}
        }
    }
    catch (err) {
        console.log("on frame_object error: ", err);
    }
});

module.exports = init;
