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
const BufferReader = require('buffer-reader');
const BitStream = require('libs/utils/bitbuffer').BitStream;

var C = xbeeapi.constants;

var xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

var is_portopened = false;
var serialport = 0;
var pending_task = {};
var clusterfns = {};
var neighbortable = [];

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
        ////console.log(result);
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
            // execute the command
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


module.exports.send = function (cmd, callback) {
    try {
        if (!cmd) {
            return callback("invalid payload data at XBEE send()");
        }

        var txframe = { // AT Request to be sent to 
            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
            destination64: cmd.destination64,
            destination16: cmd.destination16 || 'fffe',
            clusterId: cmd.clusterId,
            profileId: cmd.profileId,
            data: cmd.data
        };

        if (cmd.hasOwnProperty("sourceEndpoint")) {
            txframe.sourceEndpoint = cmd.sourceEndpoint;
        }

        if (cmd.hasOwnProperty("destinationEndpoint")) {
            txframe.destinationEndpoint = cmd.destinationEndpoint;
        }

        if (cmd.txid && callback && ((callback instanceof Function) || (typeof callback === "function"))) {
            var txid = cmd.txid;
            var timer = 0

            if (cmd.timeout) {
                timer = setTimeout(
                    function () {
                        delete_pending_task(txid);
                        callback(constants.IOT_ERROR_TIMEDOUT); //-2 = timed out
                    },
                    cmd.timeout
                );
            }

            // create a pending task for it
            add_pending_task(
                txid,
                {
                    id: cmd.destination64,
                    fn: callback,
                    timer: timer
                }
            );            
        }

        serialport.write(xbee.buildFrame(txframe));

        //
    }
    catch (err) {
        callback(err);
    }
}

var handle_cluster_descriptor = function (frame) {
    //console.log("handle_cluster_descriptor");
    if (!frame.remote64 || typeof frame.remote64 != 'string') {
        throw new Error("invalid remote64 data for response 8032");
    }
    ////console.log(util.inspect(frame));
    events.emit(
        events.TYPES.ONIOTEVENT,
        constants.IOTACTIVITY,
        {
            type: constants.ACTIVE_DEVICE_FOUND,
            id: frame.remote64,
            address16: frame.remote16
        }
    );             

    // clear the routetable so it will be populated with clusterID 0x31
    neighbortable = [];

    //
};


var handle_cluster_neighbortable = function (frame) {
    try {
        //console.log("handle_cluster_neighbortable");
        //console.log(util.inspect(frame));

        var bufflen = frame.data.length;
        var reader = new BufferReader(frame.data);
        var id = reader.nextUInt8();
        var status = reader.nextUInt8();
        var devices_length = reader.nextUInt8();
        var startindex = reader.nextUInt8();
        var count = reader.nextUInt8();
        //console.log("buffer length: %d, status: %d, devices length: %d, startindex: %d, count: %d", bufflen, status, devices_length, startindex, count);

        if (count <= 0) {
            return;
        }

        var parsed = 0;
        while (parsed < count) {

            var device = {};

            var panidbuf = reader.nextBuffer(8);
            panidbuf.swap64();
            var panid = panidbuf.toString("hex");
            //console.log("panidbuf: %s", panid);
            var addressbuf = reader.nextBuffer(8);
            addressbuf.swap64();
            var address = addressbuf.toString("hex");
            //console.log("address: %s", address);
            var shortaddrbuf = reader.nextBuffer(2);
            shortaddrbuf.swap16();
            var address16 = shortaddrbuf.toString("hex");
            //console.log("address16: %s", address16);

            var devinfobuf = reader.nextBuffer(1);
            var devinfobits = new BitStream(devinfobuf);
            var device_type = devinfobits.readBits(2);
            //console.log("device_type: %s", device_type);
            var iddle_enable = devinfobits.readBits(2);
            //console.log("iddle_enable: %s", iddle_enable);
            device.iddle_enable = iddle_enable;
            /*
            Indicates if the neighbor’s receiver is enabled during idle times.
            0x0 – Receiver is off
            0x1 – Receiver is on
            0x02 – Unknown
            */

            var relationship = devinfobits.readBits(3);
            //console.log("relationship: %s", relationship);
            device.relationship = relationship;
            /*
            The relationship of the neighbor with the remote device:
            0x0 – Neighbor is the parent
            0x1 – Neighbor is a child
            0x2 – Neighbor is a sibling
            0x3 – None of the above
            0x4 – Previous child
            */

            var permitbuf = reader.nextBuffer(1);
            var permitbits = new BitStream(permitbuf);
            var permitjoin = permitbits.readBits(2);
            device.permitjoin = permitjoin;
            //console.log("permitjoin: %s", permitjoin);
            /*
            Indicates if the neighbor is accepting join requests.
            0x0 – Neighbor not accepting joins
            0x1 – Neighbor is accepting joins
            0x2 – Unknown
            */

            var depth = reader.nextUInt8();
            var lqi = reader.nextUInt8();
            device.depth = depth;
            device.lqi = lqi;
            //console.log("depth: %d, lqi: %d", depth, lqi);
            var address64 = address.toLowerCase();
            device.address64 = address64;
            device.address16 = address16;

            neighbortable.push(device);
           
            parsed++;
        };

        var txid = frame.data[0];
        var pending = pending_task[txid];
        if (pending) {
            var timer = pending.timer;
            if (timer) {
                clearTimeout(timer);                
            }
            var callback = pending.fn;
            if (callback) {
                callback(null, frame.remote64, frame.remote16, startindex, count, devices_length, neighbortable);
            }
            delete_pending_task(txid);
        }
      
    }
    catch (err) {
        logger.error("xhandle_cluster_neighbortable error: %j", err);
    }
};

var handle_cluster_switch = function (frame) {
    //console.log("handle_cluster_switch");

    var txid = frame.data[1];
    var callback = pending_task[txid];
    if (callback) {
        // the callback will parse it
        callback(frame.data);
    }
};

var handle_cluster_temperature = function (frame) {
    //console.log("handle_cluster_switch");

    var value = constants.IOT_STATUS_UNKOWN;

    var reader = new BufferReader(frame.data);
    reader.seek(1);

    var txid = reader.nextUInt8();

    reader.seek(5);

    var status = reader.nextUInt8();
    //console.log("status: %d", status);
    if (status != 0) {
        return;
    }

    var datatype = reader.nextUInt8();
    //console.log("datatype: %d", datatype);
    if (datatype != 0x29) {
        return;
    }

    var valuebuf = reader.nextBuffer(2);
    valuebuf.swap16();
    var tempvalue = valuebuf.readUInt16BE(0);
    value = tempvalue * 0.01;
    console.log("temperature: %f Celsius", value);

    //var txid = frame.data[1];
    var pending = pending_task[txid];
    if (pending) {
        var timer = pending.timer;
        if (timer) {
            clearTimeout(timer);
        }
        var callback = pending.fn;
        if (callback) {
            callback(null, value);
        }
        delete_pending_task(txid);
    }
};

clusterfns = {
    "8032": handle_cluster_descriptor,
    "8031": handle_cluster_neighbortable,
    "0006": handle_cluster_switch,
    "0402": handle_cluster_temperature
};


function init() {

    is_portopened = false;
    var port = config.iot_config.serialport;
    logger.debug("xbee init(), try open serial port: " + port);

    serialport = new SerialPort(
        port,
        {
            baudrate: 9600
        },
        function(err) {
            if (err) {
                logger.error('Serial port error: ', err.message);
            }
        }
    );

    serialport.on("open", function(err) {
        if (err) {
            return logger.error('Error opening port: ', err.message);
        }

        logger.debug('serial port ON open');

        is_portopened = true;

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
            100
        );

        //
    });


    serialport.on("data", function(data) {
        xbee.parseRaw(data);
    });

    serialport.on("close", function (err) {
        if (err && err.disconnected == true) {
            logger.info('serial port is disconnected');
        }
        is_portopened = false;
    });

}

xbee.on("frame_object", function(frame) {
    try {
        if (!frame || !frame.clusterId) {
            return;
        }

        var handler = clusterfns[frame.clusterId];
        if (handler) {
            handler(frame);
        }
        return;

        /*
        if (frame.clusterId == "8032") { // descriptor response
            if (!frame.remote64 || typeof frame.remote64 != 'string') {
                throw new Error("invalid remote64 data for response 8032");
            }
            ////console.log(util.inspect(frame));
            events.emit(
                events.TYPES.ONIOTEVENT,
                constants.IOTACTIVITY,
                {
                    type: constants.ACTIVE_DEVICE_FOUND,
                    id: frame.remote64,
                    address16: frame.remote16
                }
            );                
        }
        if (frame.clusterId == "8031") {

        }
        else if (frame.data && frame.clusterId == "0006" ) {
            var txid = frame.data[1];
            var callback = pending_task[txid];
            if (callback) {
                // the callback will parse it
                callback(frame.data);
            }
        }
        */

    }
    catch (err) {
        logger.error("on XBEE frame error: %j", err);
    }
});


module.exports.monitor = function() {

    setInterval(
        function () {
            if (!is_portopened) {
                //console.log("try to init");
                init();
            }
        },
        10000
    );
}


module.exports.init = init;
module.exports.executecmd = cmd_handler;