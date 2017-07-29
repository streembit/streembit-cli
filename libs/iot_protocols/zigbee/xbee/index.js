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
        //debugger;
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
    console.log("handle_cluster_temperature");

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
    console.log("temperature: %f Celsius", value);
    
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


/*

FROM DEV



var util = require('util');
var SerialPort = require('serialport');
var sleep = require('system-sleep');
var xbeeapi = require('./xbeeapi');
var devicelist = require('./devicelist');
var events = require("./events");
var BufferReader = require('buffer-reader');
var BitStream = require('./bitbuffer').BitStream;
var sprintf = require('sprintf-js').sprintf;

//console.log(sprintf("%04x", 0x0b05));
//console.log(sprintf("%04x", 0x0003));
//console.log(sprintf("%04x", 0x0000));

//process.exit(0);

var MYENDPOINT = 0x02;

var devdata = {};

// initialize the device list
try {
    devicelist.init();
}
catch (err) {
    console.log(err.message || err);
    console.log("devicelist init failed, process exists ...");
    process.exit(1);
}

var C = xbeeapi.constants;

var xbee = new xbeeapi.XBeeAPI({
    api_mode: 1
});

var serialport = new SerialPort(
    "Com3",
    {
        baudrate: 9600
    },
    function (err) {
        if (err) {
            console.log('Serial port error: ', err.message);
        }
    }
);


function toggle() {

    console.log("\ntry to toggle switch ...\n");

    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'e429',
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x01,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x01, 0x01, 0x02]
    };

    serialport.write(xbee.buildFrame(txframe));
}

function turnoff() {
    console.log("\ntry to turn OFF switch ...\n");

    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'e429',
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x01,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x01, 0x01, 0x00]
    };

    serialport.write(xbee.buildFrame(txframe));

}


function turnon() {
    console.log("\ntry to turn ON switch ...\n");

    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'e429',
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x01,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x01, 0x01, 0x01]
    };

    serialport.write(xbee.buildFrame(txframe));

}


function read_switchstatus() {
    console.log("read_switchstatus");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x00, 0xab, 0x00, 0x00, 0x00]
    };

    serialport.write(xbee.buildFrame(txframe));
}

function read_active_power(address64, address16, sourceend, destend) {
    console.log("read_active_power");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: 0x0b04,
        profileId: 0x0104,
        data: [0x00, 0xbe, 0x00, 0x0b, 0x05]
    };

    serialport.write(xbee.buildFrame(txframe));
}


function read_voltage(address64, address16, sourceend, destend) {
    console.log("read_voltage");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: 0x0b04,
        profileId: 0x0104,
        data: [0x00, 0xbc, 0x00, 0x05, 0x05]  // RMS Voltage 0x0505
    };

    serialport.write(xbee.buildFrame(txframe));
}


function configure_report(address64, address16, sourceend, destend) {
    console.log("configure reporting");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: 0x0006,
        profileId: 0x0104,
        //data: [0x00, 0xdd, 0x06, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00]
        data: [0x00, 0xdd, 0x06, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x10, 0x00  ]


            //0x00: Frame Control Field
            //The frame control field is 8-bits in length and contains information defining the
            //command type and other control flags. The frame control field shall be formatted
            //as shown in Figure 2.3. Bits 5-7 are reserved for future use and shall be set to 0.
            //... it seems 0x00 is correct

            //0xdd: Transaction Sequence Number
            //The transaction sequence number field is 8-bits in length and specifies an
            //identification number for the transaction so that a response-style command frame
            //can be related to a request-style command frame. The application object itself
            //shall maintain an 8-bit counter that is copied into this field and incremented by
            //one for each command sent. When a value of 0xff is reached, the next command
            //shall re-start the counter with a value of 0x00.
            //The transaction sequence number field can be used by a controlling device, which
            //may have issued multiple commands, so that it can match the incoming responses
            //to the relevant command.

            //0x06:Command identifier
            //Configure reporting -> 0x06, Table 2.9 ZCL Command Frames

            //0x00: Direction field
            //If this value is set to 0x00, then the attribute data type field, the minimum
            //reporting interval field, the maximum reporting interval field and the reportable
            //change field are included in the payload, and the timeout period field is omitted.
            //The record is sent to a cluster server (or client) to configure how it sends reports to
            //a client (or server) of the same cluster;

            //0x0000: Attribute Identifier Field
            //Table 3.38 Attributes of the On/Off Server Cluster
            //Identifier  Name    Type        Range           Access      Default     Mandatory
            //0x0000      OnOff   Boolean     0x00 – 0x01     Read only   0x00        M

            //0x10: Attribute Data Type Field
            //The Attribute data type field contains the data type of the attribute that is to be reported.
            //0x10 for boolean

            //0x00, 0x00: Minimum Reporting Interval Field
            //The minimum reporting interval field is 16-bits in length and shall contain the
            //minimum interval, in seconds, between issuing reports of the specified attribute.
            //If this value is set to 0x0000, then there is no minimum limit, unless one is
            //imposed by the specification of the cluster using this reporting mechanism or by
            //the applicable profile.

            //0x00, 0x20: Maximum Reporting Interval Field
            //The maximum reporting interval field is 16-bits in length and shall contain the
            //maximum interval, in seconds, between issuing reports of the specified attribute.
            //If this value is set to 0xffff, then the device shall not issue reports for the specified
            //attribute, and the configuration information for that attribute need not be
            //maintained. (Note:- in an implementation using dynamic memory allocation, the
            //memory space for that information may then be reclaimed).

            //Next is not exists as for boolean which is a "Discrete" data type it is emitted:
            //The reportable change field shall contain the minimum change to the attribute that
            //will result in a report being issued. This field is of variable length. For attributes
            //with 'analog' data type (see Table 2.15) the field has the same data type as the
            //attribute. The sign (if any) of the reportable change field is ignored.
            //For attributes of 'discrete' data type (see Table 2.15) this field is omitted.

            //0x00,0x00: Timeout Period Field
            //The timeout period field is 16-bits in length and shall contain the maximum
            //expected time, in seconds, between received reports for the attribute specified in
            //the attribute identifier field. If more time than this elapses between reports, this
            //may be an indication that there is a problem with reporting.
            //If this value is set to 0x0000, reports of the attribute are not subject to timeout.



    };

    serialport.write(xbee.buildFrame(txframe));
}


function read_current() {
    console.log("read_current");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0b04,
        profileId: 0x0104,
        data: [0x00, 0xbd, 0x00, 0x08, 0x05] // 0x05, 0x08]  // RMS Current 0x0508
    };

    serialport.write(xbee.buildFrame(txframe));
}



function read_current_multiplier() {
    console.log("read_current_multiplier");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0b04,
        profileId: 0x0104,
        data: [0x00, 0xbf, 0x00, 0x06, 0x02]  // AC Current Multiplier 0x0602
    };

    serialport.write(xbee.buildFrame(txframe));
}

function read_current_divisor() {
    console.log("read_current_divisor");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0b04,
        profileId: 0x0104,
        data: [0x00, 0xb1, 0x00, 0x06, 0x03]  // AC Current Divisor 0x0603
    };

    serialport.write(xbee.buildFrame(txframe));
}


function read_measurement_type() {
    console.log("read_measurement_type");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: '000d6f000bbc50b6',
        destination16: 'fffe', //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0b04,
        profileId: 0x0104,
        data: [0x00, 0xa1, 0x00, 0x00, 0x00]  // Measurement type 0x0000
    };

    serialport.write(xbee.buildFrame(txframe));
}

function find_connected_devices(address64, index) {
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: 'fffe',
        clusterId: 0x0031,
        profileId: 0x0000,
        data: [0x77, index]
    };

    serialport.write(xbee.buildFrame(txframe));
}


function read_temperature(address64, address16) {
    console.log("read_temperature");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16, //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0402,
        profileId: 0x0104,
        data: [0x00, 0xc1, 0x00, 0x00, 0x00]  // Measured Value 0x0000
    };

    serialport.write(xbee.buildFrame(txframe));
}

function read_humidity(address64, address16) {
    console.log("read_humidity");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16, //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0xfc45,
        profileId: 0x0104,
        data: [0x00, 0xc2, 0x00, 0x00, 0x00]  // Measured Value 0x0000
    };

    serialport.write(xbee.buildFrame(txframe));
}

function poll_read_checkin(address64, address16) {
    console.log("poll_read_checkin");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16, //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0020,
        profileId: 0x0104,
        data: [0x00, 0xc3, 0x00, 0x00, 0x00]  // Measured Value 0x0000
    };

    serialport.write(xbee.buildFrame(txframe));
}


function poll_read_longpollinterval (address64, address16) {
    console.log("poll_read_longpollinterval");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16, //'fffe', //'e429',
        sourceEndpoint: 0x00, //0x00,
        destinationEndpoint: 0x01, // 0x01,
        clusterId: 0x0020,
        profileId: 0x0104,
        data: [0x00, 0xc4, 0x00, 0x01, 0x00]  // Measured Value 0x0000
    };

    serialport.write(xbee.buildFrame(txframe));
}


function match_descriptor_response(address64, address16, data) {
    console.log("match_descriptor_response");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        clusterId: 0x8006,
        profileId: 0x0000,
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        data: data
    };

    serialport.write(xbee.buildFrame(txframe));
}


function active_endpoint_request(address64, address16, data) {
    console.log("active_endpoint_request");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        clusterId: 0x0005,
        profileId: 0x0000,
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        data: data
    };

    serialport.write(xbee.buildFrame(txframe));
}

function simple_descriptor_request(address64, address16, data) {
    console.log("simple_descriptor_request");
    var txframe = { // AT Request to be sent to
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        clusterId: 0x0004,
        profileId: 0x0000,
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        data: data
    };

    serialport.write(xbee.buildFrame(txframe));
}




serialport.on("open", function (err) {
    if (err) {
        return console.log('Error opening port: ', err.message);
    }

    console.log('serial port ON open');

    //var txframe = { // AT Request to be sent to
    //    type: C.FRAME_TYPE.AT_COMMAND,
    //    command: "NI",
    //    commandParameter: [],
    //};

    //serialport.write(xbee.buildFrame(txframe));

    //var txframe = { // AT Request to be sent to
    //    type: C.FRAME_TYPE.AT_COMMAND,
    //    command: "ID",
    //    commandParameter: [],
    //};

    //serialport.write(xbee.buildFrame(txframe));

    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "NI",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    2000
    //);


    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "SH",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    3000
    //);

    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "SL",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    4000
    //);

    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "MY",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    5000
    //);

    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "CI",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    6000
    //);


    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "AP",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    7000
    //);


    //setTimeout(function () {
    //    txframe = { // AT Request to be sent to
    //        type: C.FRAME_TYPE.AT_COMMAND,
    //        command: "AI",
    //        commandParameter: [],
    //    };

    //    serialport.write(xbee.buildFrame(txframe));
    //},
    //    8000
    //);


    //setTimeout(function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.AT_COMMAND,
    //            command: "ND",
    //            commandParameter: [],
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    10000
    //);

    //setTimeout(
    //    function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
    //            clusterId: 0x0032,
    //            profileId: 0x0000,
    //            data: [0x12, 0x01]
    //            //data: [0x01, 0x00]
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    1000
    //);

    // active endpoint request

    //setTimeout(
    //    function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
    //            clusterId: 0x0005,
    //            profileId: 0x0000,
    //            data: [0x12, 0x01]
    //            //data: [0x01, 0x00]
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    1000
    //);



    //setTimeout(
    //    function () {
    //        txframe = { // AT Request to be sent to
    //            type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
    //            clusterId: 0x0002,
    //            profileId: 0x0000,
    //            data: [0x01, 0x00, 0x00, 0x0D, 0x6F, 0x00, 0x0B, 0xBC, 0x50, 0xB6]
    //        };

    //        serialport.write(xbee.buildFrame(txframe));
    //    },
    //    3000
    //);


    //setInterval(function () {
    //        toggle();
    //    },
    //    3000
    //);

    //
    //setTimeout(function () {
    //        turnoff()
    //    },
    //    4000
    //);


    //setTimeout(function () {
    //        turnon()
    //    },
    //    7000
    //);

});

serialport.on("data", function (data) {
    xbee.parseRaw(data);
});

// All frames parsed by the XBee will be emitted here
xbee.on("frame_object", function (frame) {
    try {
        if (frame) {
            ////console.log("OBJ " + util.inspect(frame));
            //console.log("type: " + frame.type);
            console.log("type: " + frame.type + " clusterid: " + frame.clusterId);

            //console.log(util.inspect(frame));

            if (frame.clusterId == "8032") {
                if (frame.remote64 && typeof frame.remote64 == 'string') {
                    //var mac = frame.remote64.toLowerCase();
                    //devicelist.update(mac, true);

                    if (frame.remote64 && frame.remote64.toUpperCase() == "0013A20041679C00") {
                        console.log(util.inspect(frame));
                        setTimeout(
                            function () {
                                find_connected_devices('0013a20041679c00', 0);
                            },
                            1000);
                    }

                    if (frame.remote64 && frame.remote64.toUpperCase() == "000D6F000BBC50B6") {
                        //setTimeout( configure_report, 2000);
                        //setTimeout(toggle, 2000);

                        //setTimeout(read_switchstatus, 1000);

                        //setTimeout(read_measurement_type, 2000);

                        setTimeout(read_voltage, 2000);
                        //setTimeout(read_current, 3000);

                        //setTimeout(read_active_power, 4000);

                        //setTimeout(read_current_divisor, 5000);
                        //setTimeout(read_current_multiplier, 6000);
                    }
                }
            }

            if (frame.clusterId == "8031" || frame.clusterId == "8032" || frame.clusterId == "0006" ||
                frame.clusterId == "8002" || frame.clusterId == "0b04" || frame.clusterId == "0402" ||
                frame.clusterId == "fc45" || frame.clusterId == "0020" || frame.clusterId == "0013" ||
                frame.clusterId == "8004" || frame.clusterId == "8005" || frame.clusterId == "0019" ) {

                if (frame.clusterId == "8031") {
                    console.log(util.inspect(frame));

                    var bufflen = frame.data.length;
                    var reader = new BufferReader(frame.data);
                    var id = reader.nextUInt8();
                    var status = reader.nextUInt8();
                    var devices_length = reader.nextUInt8();
                    var startindex = reader.nextUInt8();
                    var count = reader.nextUInt8();
                    console.log("buffer length: %d, status: %d, devices length: %d, startindex: %d, count: %d", bufflen, status, devices_length, startindex, count);

                    if (count <= 0) {
                        return;
                    }

                    var parsed = 0;
                    while (parsed < count) {
                        var panidbuf = reader.nextBuffer(8);
                        panidbuf.swap64();
                        var panid = panidbuf.toString("hex");
                        console.log("panidbuf: %s", panid);
                        var addressbuf = reader.nextBuffer(8);
                        addressbuf.swap64();
                        var address = addressbuf.toString("hex");
                        console.log("address: %s", address);
                        var shortaddrbuf = reader.nextBuffer(2);
                        shortaddrbuf.swap16();
                        var address16 = shortaddrbuf.toString("hex");
                        console.log("address16: %s", address16);

                        var devinfobuf = reader.nextBuffer(1);
                        var devinfobits = new BitStream(devinfobuf);
                        var device_type = devinfobits.readBits(2);
                        console.log("device_type: %s", device_type);
                        var iddle_enable = devinfobits.readBits(2);
                        console.log("iddle_enable: %s", iddle_enable);

                        //Indicates if the neighbor’s receiver is enabled during idle times.
                        //0x0 – Receiver is off
                        //0x1 – Receiver is on
                        //0x02 – Unknown


                        var relationship = devinfobits.readBits(3);
                        console.log("relationship: %s", relationship);

                        //The relationship of the neighbor with the remote device:
                        //0x0 – Neighbor is the parent
                        //0x1 – Neighbor is a child
                        //0x2 – Neighbor is a sibling
                        //0x3 – None of the above
                        //0x4 – Previous child


                        var permitbuf = reader.nextBuffer(1);
                        var permitbits = new BitStream(permitbuf);
                        var permitjoin = permitbits.readBits(2);
                        console.log("permitjoin: %s", permitjoin);

                        //Indicates if the neighbor is accepting join requests.
                        //0x0 – Neighbor not accepting joins
                        //0x1 – Neighbor is accepting joins
                        //0x2 – Unknown

                        var depth = reader.nextUInt8();
                        var lqi = reader.nextUInt8();
                        console.log("depth: %d, lqi: %d", depth, lqi);

                        var mac = address.toLowerCase();
                        devicelist.update(mac, true);

                        if (mac == "000d6f000b2d653f") {
                            setTimeout(
                                function () {
                                    //poll_read_checkin(mac, address16);
                                },
                                1000
                            );
                            setTimeout(
                                function () {
                                    //poll_read_longpollinterval(mac, address16);
                                },
                                2000
                            );
                            setTimeout(
                                function () {
                                    //read_temperature(mac, address16);
                                },
                                200
                            );
                            //setTimeout(
                            //    function () {
                            //        read_humidity(mac, address16);
                            //    },
                            //    4000
                            //);
                        }

                        if (mac == "000d6f000bbc50b6") {
                            //setTimeout(read_active_power, 1000);
                            //setTimeout(read_voltage, 2000);
                        }

                        parsed++;
                    };

                    if ((startindex + count) < devices_length) {
                        console.log("continue to read routing table from index " + (startindex + count));
                        // read again from the current index
                        find_connected_devices('0013a20041679c00', (startindex + count));
                    }
                    else {
                        console.log("routing table was read, count: " + (startindex + count));
                    }

                }
                else if (frame.clusterId == "0b04") {
                    if (frame.data[1] == 0xa1) {
                        console.log("measurement type");
                        console.log(util.inspect(frame));
                    }
                    else if (frame.data[1] == 0xbe) {
                        console.log("read_active_power reply");
                        console.log(util.inspect(frame));

                        var reader = new BufferReader(frame.data);
                        reader.seek(5);
                        var status = reader.nextUInt8();
                        console.log("status: %d", status);
                        if (status != 0) {
                            return;
                        }

                        var datatype = reader.nextUInt8();
                        console.log("datatype: %d", datatype);
                        if (datatype != 0x29) {
                            return;
                        }

                        var valuebuf = reader.nextBuffer(2);
                        valuebuf.swap16();
                        var value = valuebuf.readUInt16BE(0);

                        console.log("power: %d Watts", value);

                    }
                    else if (frame.data[1] == 0xbd) {
                        console.log("read_current reply");
                        console.log(util.inspect(frame));
                    }
                    else if (frame.data[1] == 0xbc) {
                        console.log("read_voltage reply");
                        console.log(util.inspect(frame));

                        var reader = new BufferReader(frame.data);
                        reader.seek(3);
                        var attribute = reader.nextUInt16LE().toString(16);
                        console.log("attribute: %s", attribute);

                        var status = reader.nextUInt8();
                        console.log("status: %d", status);
                        if (status != 0) {
                            return;
                        }

                        var datatype = reader.nextUInt8();
                        console.log("datatype: %s", datatype.toString(16));
                        if (datatype != 0x21) {
                            return;
                        }

                        var valuebuf = reader.nextBuffer(2);
                        valuebuf.swap16();
                        var value = valuebuf.readUInt16BE(0);

                        console.log("Voltage: %d Volt", value);
                    }
                }
                else if (frame.clusterId == "0402") {
                    console.log(util.inspect(frame));

                    var reader = new BufferReader(frame.data);
                    reader.seek(5);
                    var status = reader.nextUInt8();
                    console.log("status: %d", status);
                    if (status != 0) {
                        return;
                    }

                    var datatype = reader.nextUInt8();
                    console.log("datatype: %d", datatype);
                    if (datatype != 0x29) {
                        return;
                    }

                    var valuebuf = reader.nextBuffer(2);
                    valuebuf.swap16();
                    var value = valuebuf.readUInt16BE(0);
                    value = value * 0.01;

                    console.log("temperature: %f Celsius", value);

                }
                else if (frame.clusterId == "fc45") {
                    console.log(util.inspect(frame));

                    var reader = new BufferReader(frame.data);
                    reader.seek(5);
                    var status = reader.nextUInt8();
                    console.log("status: %d", status);
                    if (status != 0) {
                        return;
                    }

                    var datatype = reader.nextUInt8();
                    console.log("datatype: %d", datatype);
                    if (datatype != 0x29) {
                        return;
                    }

                    var valuebuf = reader.nextBuffer(2);
                    valuebuf.swap16();
                    var value = valuebuf.readUInt16BE(0);
                    value = value * 0.01;

                    console.log("relative humidity: %f%", value);

                }
                else if (frame.clusterId == "0006") {
                    console.log(util.inspect(frame));

                    if (frame.profileId == "0000") {

                        devdata[frame.remote64] = { endpoint: 0, clusters: 0 };

                        var reader = new BufferReader(frame.data);
                        var id = reader.nextUInt8();

                        var valuebuf = reader.nextBuffer(2);
                        valuebuf.swap16();
                        var destaddress = valuebuf.readUInt16BE(0);

                        console.log("id: %s, dest: %s", id.toString(16), destaddress.toString(16));

                        valuebuf = reader.nextBuffer(2);
                        valuebuf.swap16();
                        var requested_profile = valuebuf.readUInt16BE(0);
                        console.log("requested profile: %s", requested_profile.toString(16));

                        var number_of_input_clusters = reader.nextUInt8();
                        console.log("number_of_input_clusters: %d", number_of_input_clusters);

                        // reply with 8006

                        //var myaddress16 = '0000';
                        //var addressbuf = Buffer.from(myaddress16, 'hex');
                        //addressbuf.swap16();

                        const respbuf = Buffer.alloc(6);
                        respbuf.writeUInt8(0x11, 0); // transaction sequence number (arbitrarily chosen)
                        respbuf.writeUInt8(0x00, 1); // status
                        respbuf.writeUInt16LE(0x0000, 2); // Indicates the 16-bit address of the responding device, this is the coordinator with address 0x0000
                        respbuf.writeUInt8(0x01, 4); // 1 endpoint
                        respbuf.writeUInt8(MYENDPOINT, 5); // set endpoint tp 0x02
                        var response = [...respbuf];
                        console.log("match descriptor response data: " + util.inspect(response));
                        match_descriptor_response(frame.remote64, frame.remote16, response);

                        // send Active Endpoint Request 0x0005
                        var addressbuf = Buffer.from(frame.remote16, 'hex');
                        addressbuf.swap16();
                        const aerbuf = Buffer.alloc(3);
                        aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)
                        addressbuf.copy(aerbuf, 1);
                        var aerdata = [...aerbuf];
                        console.log("Active Endpoint Request data: " + util.inspect(aerdata));
                        setTimeout(
                            () => {
                                active_endpoint_request(frame.remote64, frame.remote16, aerdata);
                            },
                            1000
                        );

                    }
                }
                else if (frame.clusterId == "0020") {
                    console.log(util.inspect(frame));
                    var reader = new BufferReader(frame.data);
                    reader.seek(1);

                    var cmdid = reader.nextUInt8();
                    var cmdframe = reader.nextUInt8();
                    if (cmdframe != 0x01) {
                        console.log("invalid command frame");
                        return;
                    }

                    var attribute = reader.nextUInt16LE().toString(16);
                    console.log("attribute: %s", attribute);

                    var status = reader.nextUInt8();
                    console.log("status: %d", status);
                    if (status != 0) {
                        return;
                    }

                    if (cmdid == 0xc3) {
                        var datatype = reader.nextUInt8();
                        console.log("datatype: %d", datatype);
                        if (datatype != 0x23) {
                            return;
                        }

                        var valuebuf = reader.nextBuffer(4);
                        valuebuf.swap32();
                        var value = valuebuf.readUInt32BE(0);
                        value = value / 4;

                        console.log("poll check-in: %d seconds", value);
                    }
                    else if (cmdid == 0xc4) {
                        var datatype = reader.nextUInt8();
                        console.log("datatype: %d", datatype);
                        if (datatype != 0x23) {
                            return;
                        }

                        var valuebuf = reader.nextBuffer(4);
                        valuebuf.swap32();
                        var value = valuebuf.readUInt32BE(0);
                        value = value / 4;

                        console.log("poll longpoll interval: %d seconds", value);
                    }

                }
                else if (frame.clusterId == "0013") {
                    console.log(util.inspect(frame));

                    devdata[frame.remote64] = { endpoint:0, clusters: 0};

                    // reply with 0x0005
                    var addressbuf = Buffer.from(frame.remote16, 'hex');
                    addressbuf.swap16();
                    const aerbuf = Buffer.alloc(3);
                    aerbuf.writeUInt8(0x12, 0); // transaction sequence number (arbitrarily chosen)
                    addressbuf.copy(aerbuf, 1);
                    var aerdata = [...aerbuf];
                    console.log("Active Endpoint Request data: " + util.inspect(aerdata));
                    active_endpoint_request(frame.remote64, frame.remote16, aerdata);


                }
                else if (frame.clusterId == "8005") {
                    console.log(util.inspect(frame));

                    if (frame.profileId == "0000") {

                        var reader = new BufferReader(frame.data);
                        var id = reader.nextUInt8();
                        var status = reader.nextUInt8();

                        var valuebuf = reader.nextBuffer(2);
                        valuebuf.swap16();
                        var destaddress = valuebuf.readUInt16BE(0);

                        console.log("id: %s, status: 5d, address16: %s", id.toString(16), status, destaddress.toString(16));

                        // Number of endpoints in the following endpoint list
                        var number_of_endpoints = reader.nextUInt8();
                        console.log("number_of_endpoints: %d", number_of_endpoints);
                        var endpoints = [];
                        for (var i = 0; i < number_of_endpoints; i++) {
                            var endpoint = reader.nextUInt8();
                            endpoints.push(endpoint);
                        }
                        console.log("endpoints: " + util.inspect(endpoints));

                        if (endpoints.length) {
                            devdata[frame.remote64] = { endpoint: endpoints[0] };
                        }
                        console.log(frame.remote64 + "devdata: " + util.inspect(devdata[frame.remote64]));

                        // reply with 0004 Simple Descriptor Request
                        var addressbuf = Buffer.from(frame.remote16, 'hex');
                        addressbuf.swap16();
                        const sdrbuf = Buffer.alloc(4);
                        sdrbuf.writeUInt8(0x15, 0); // 0x15 transaction sequence number (arbitrarily chosen)
                        addressbuf.copy(sdrbuf, 1);
                        // send to the first endpoint
                        var endp = endpoints[0];
                        sdrbuf.writeUInt8(endp, 3);
                        var sdrdata = [...sdrbuf];
                        console.log("Simple Descriptor Request data: " + util.inspect(sdrdata));
                        simple_descriptor_request(frame.remote64, frame.remote16, sdrdata);
                    }
                }
                else if (frame.clusterId == "0019") {
                    //console.log(util.inspect(frame));
                }
                else if (frame.clusterId == "8004") {
                    console.log(util.inspect(frame));

                    var reader = new BufferReader(frame.data);
                    var id = reader.nextUInt8();
                    var status = reader.nextUInt8();

                    if (status != 0) {
                        return console.log("Simple Descriptor Request status: error ");
                    }

                    reader.seek(11);
                    var count = reader.nextUInt8();
                    console.log("count of clusters: " + count);
                    var clusters = [];
                    for (var i = 0; i < count; i++) {
                        var cluster = reader.nextUInt16LE();
                        var txtcluster = sprintf("%04x", cluster);
                        clusters.push(txtcluster);
                    }

                    console.log(frame.remote64 + " clusters: " + util.inspect(clusters));

                    devdata[frame.remote64].clusters = clusters;

                    setTimeout(
                        () => {
                            // get the voltage
                            configure_report(frame.remote64, frame.remote16, MYENDPOINT, devdata[frame.remote64].endpoint);
                        },
                        2000
                    );

                    setTimeout(
                        () => {
                            // get the voltage
                            read_voltage(frame.remote64, frame.remote16, MYENDPOINT, devdata[frame.remote64].endpoint);
                        },
                        3000
                    );

                    setTimeout(
                        () => {
                            // get the voltage
                            read_active_power(frame.remote64, frame.remote16, MYENDPOINT, devdata[frame.remote64].endpoint);
                        },
                        4000
                    );

                }
            }

            if (frame.type == 139) {
                //console.log(util.inspect(frame));
            }
        }
    }
    catch (err) {
        console.log("on frame_object error: ", err);
    }
});




*/