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
var pending_tasks = [];
var clusterfns = {};
var neighbortable = [];

function add_pending_task(task) {
    pending_tasks.push(task);
}

function delete_pending_task(taskid, address64) {
    for (var i = 0; i < pending_tasks.length; i++) {
        if (pending_tasks[i].address64 == address64 && pending_tasks[i].taskid == taskid) {
            pending_tasks.splice(i, 1);
            //console.log("removing pending task " + taskid + " " + address64);
            break;
        }
    }
}

function get_pending_task(taskid, address64) {
    var callback = 0;
    for (var i = 0; i < pending_tasks.length; i++) {
        if (pending_tasks[i].address64 == address64 && pending_tasks[i].taskid == taskid) {
            callback = pending_tasks[i].fn;
            // clear the timer
            if (pending_tasks[i].timer) {
                clearTimeout(pending_tasks[i].timer);
            }
            pending_tasks.splice(i, 1);
            break;
        }
    }
    return callback;
}


function sendframe (cmd, callback) {
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
            var taskid = cmd.taskid;
            var address64 = cmd.destination64;
            var timer = 0

            if (cmd.timeout) {
                timer = setTimeout(
                    () => {
                        delete_pending_task(taskid, address64);
                        callback(constants.IOT_ERROR_TIMEDOUT); //-2 = timed out
                    },
                    cmd.timeout
                );
            }

            // create a pending task for it
            add_pending_task(
                {
                    taskid: taskid,
                    address64: cmd.destination64,
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
        var clusterId = 0x0031;

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
        var callback = get_pending_task(constants.IOT_CLUSTER_NEIGHBORTABLE, frame.remote64);
        if (callback) {
            callback(null, frame.remote64, frame.remote16, startindex, count, devices_length, neighbortable);
        }
      
    }
    catch (err) {
        logger.error("handle_cluster_neighbortable error: %j", err);
    }
};

var handle_cluster_switch = function (frame) {
    try {
        if (!frame.profileId || frame.profileId != "0104" || !frame.data || frame.data[1] != 0xab ) {
            return;
        }

        //console.log(util.inspect(frame));

        var callback = get_pending_task(constants.IOT_CLUSTER_SWITCHSTATUS, frame.remote64);
        if (!callback) {
            callback = function () { };
        }

        var reader = new BufferReader(frame.data);
        reader.seek(1);
        var txid = reader.nextUInt8();
        if (txid != 0xab) {
            // only process the switch status read cluster
            return;
        }

        reader.seek(5);
        var status = reader.nextUInt8();
        if (status != 0) {
            return callback("invalid status returned");
        }
        var datatype = reader.nextUInt8();
        if (datatype != 0x10) { // must be boolean 0x10
            return callback("invalid data type returned");
        }

        var value = reader.nextUInt8();
        callback(null, value);
        
        //
    }
    catch (err) {
        logger.error("handle_cluster_switch error: %j", err);
    }
};

var handle_cluster_temperature = function (frame) {
    //debugger;
    var callback = get_pending_task(constants.IOT_CLUSTER_TEMPERATURE, frame.remote64);
    if (!callback) {
        callback = function () { };
    }

    var reader = new BufferReader(frame.data);
    reader.seek(1);
    var txid = reader.nextUInt8();
    reader.seek(5);
    var status = reader.nextUInt8();
    //console.log("status: %d", status);
    if (status != 0) {
        return callback("invalid status returned");
    }

    var datatype = reader.nextUInt8();
    //console.log("datatype: %d", datatype);
    if (datatype != 0x29) {
        return callback("invalid data type returned");
    }

    var valuebuf = reader.nextBuffer(2);
    valuebuf.swap16();
    var tempvalue = valuebuf.readUInt16BE(0);
    var value = tempvalue * 0.01;
    //console.log("temperature: %f Celsius", value);
    
    callback(null, value);

    //
};


var handle_cluster_electricmeasure = function (frame) {

    var reader = new BufferReader(frame.data);
    reader.seek(1);

    var txid = reader.nextUInt8();

    var callback = 0;
    if (txid == 0xbe) {
        callback = get_pending_task(constants.IOT_CLUSTER_POWER, frame.remote64);
    }
    else if (txid == 0xbc) {
        callback = get_pending_task(constants.IOT_CLUSTER_VOLTAGE, frame.remote64);
    } 
    else if (txid == 0xbf) {
        callback = get_pending_task(constants.IOT_CLUSTER_POWERDIVISOR, frame.remote64);
    } 
    else if (txid == 0xbb) {
        callback = get_pending_task(constants.IOT_CLUSTER_POWERMULTIPLIER, frame.remote64);
    } 

    if (!callback) {
        callback = function () { };
    }

    reader.seek(5);

    var status = reader.nextUInt8();
    if (status != 0) {
        return callback("invalid status returned");
    }

    var value = 0;
    var datatype = reader.nextUInt8();
    if (txid == 0xbc) {
        if (datatype != 0x21) {
            return callback("invalid data type returned");
        }
        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        value = valuebuf.readUInt16BE(0);
    }
    else if (txid == 0xbe) {
        if (datatype != 0x29) {
            return callback("invalid data type returned");
        }
        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        value = valuebuf.readInt16BE(0);
    }
    else if (txid == 0xbf) {
        if (datatype != 0x21) {
            return callback("invalid data type returned");
        }
        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        value = valuebuf.readUInt16BE(0);
    }
    else if (txid == 0xbb) {
        if (datatype != 0x21) {
            return callback("invalid data type returned");
        }
        var valuebuf = reader.nextBuffer(2);
        valuebuf.swap16();
        value = valuebuf.readUInt16BE(0);
    }

    callback(null, value);

    //
};

clusterfns = {
    "8032": handle_cluster_descriptor,
    "8031": handle_cluster_neighbortable,
    "0006": handle_cluster_switch,
    "0402": handle_cluster_temperature,
    "0b04": handle_cluster_electricmeasure
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
module.exports.send = sendframe;
