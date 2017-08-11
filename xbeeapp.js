'use strict';

var util = require('util');
var SerialPort = require('serialport');
var xbeeapi = require('libs/iot/iot_protocols/zigbee/xbee/xbeeapi');
var devicelist = require('./devicelist');
var events = require("./events");
var BufferReader = require('buffer-reader');
var BitStream = require('./bitbuffer').BitStream;
var sprintf = require('sprintf-js').sprintf;

var MYENDPOINT = 0x02;
var myaddress16 = 0;

/*
var address64 = '000d6f000bbc50b6';
var final = swapEUI64toLittleEndian(address64);
console.log(util.inspect(final));

address64 = '0013a20041679c00';
var final = swapEUI64toLittleEndian(address64);
console.log(util.inspect(final));

process.exit(0);
*/

//  var data = [0x00, 0xdd, 0x06, 0x00, 0x00, 0x00, 0x10, 0x10, 0x00, 0x80, 0x00];

/*
var address64 = '0013a20041679c00', cluster = 0x0006, attribute = 0x0000, datatype = 0x10, mininterval = 0x0002, maxinterval = 0x0030;

const reportbuf = Buffer.alloc(11);
reportbuf.writeUInt8(0x00, 0);  // frame control
reportbuf.writeUInt8(0xdd, 1);  // 0xdd transaction sequence number (arbitrarily chosen) 
reportbuf.writeUIntLE(cluster, 2, 2);
reportbuf.writeUIntLE(attribute, 4, 2);
reportbuf.writeUInt8(datatype, 6);
reportbuf.writeUIntLE(mininterval, 7, 2);
reportbuf.writeUIntLE(maxinterval, 9, 2);

console.log("configure reporting at " + address64 + " buffer: " + util.inspect(reportbuf));

process.exit(0);
*/

//
//
//

/*
var frame = { remote16: '9a87' };
var source64 = '0013a20041679c00', clusterid = '0006';

var dest16 = frame.remote16;
var dest16buf = Buffer.from(dest16, 'hex');
dest16buf.swap16();

var clusterbuf = Buffer.from(clusterid, 'hex');
clusterbuf.swap16();
console.log(util.inspect(clusterbuf));

var addressbuf = Buffer.from(source64, 'hex');
addressbuf.swap32();

const bindingbuf = Buffer.alloc(15);
bindingbuf.writeUInt8(0x50, 0); // 0x50 transaction sequence number (arbitrarily chosen) 
// write the source address 
addressbuf.copy(bindingbuf, 1);
// write the source endpoint
bindingbuf.writeUInt8(MYENDPOINT, 9); // MYENDPOINT = 0x02
// write the cluster id
clusterbuf.copy(bindingbuf, 10, 0);
// write the DstAddrMode
bindingbuf.writeUInt8(0x01, 12); // 0x01 = 16-bit group address for DstAddress and DstEndp not present
// write the DstAddress
dest16buf.copy(bindingbuf, 13);

console.log("Bind (Bind_req ClusterID=0x0021) buffer: " + util.inspect(bindingbuf));

process.exit(0);

*/


//var frame = {};
//frame.remote64 = "0013A20041679C00";

//const enrollbuf = Buffer.alloc(14);
//enrollbuf.writeUInt8(0x00, 0);
//enrollbuf.writeUInt8(0x22, 1);// 0x22 transaction sequence number (arbitrarily chosen) 
//enrollbuf.writeUInt8(0x02, 2); // write attribute
//enrollbuf.writeUInt16LE(0x0010, 3); // write attribute
//enrollbuf.writeUInt8(0xf0, 5); // 0xf0 data type
//var addressbuf = Buffer.from(frame.remote64, 'hex');
//addressbuf.swap32();
//addressbuf.copy(enrollbuf, 6);
//var enrolldata = [...enrollbuf];
//console.log(util.inspect(enrollbuf));
//console.log("IAS Zone enroll request data: " + util.inspect(enrolldata));

//process.exit(0);

/*
var data = [0x18,0x99,0x01,0x03,0x00,0x00,0x20,0x03,0x04,0x00,0x00,0x42,0x12,0x43,0x65,0x6e,0x74,0x72,0x61,0x4c,0x69,0x74,0x65,0x20,0x53,0x79,0x73,0x74,0x65,0x6d,0x73,0x05,0x00,0x00,0x42,0x07,0x33,0x32,0x30,0x30,0x2d,0x67,0x62];
var data1 = [0x18,0x99,0x01,0x03,0x00,0x00,0x20,0x03];
var data2 = [0x18,0x99,0x01,0x04,0x00,0x00,0x42,0x12,0x43,0x65,0x6e,0x74,0x72,0x61,0x4c,0x69,0x74,0x65,0x20,0x53,0x79,0x73,0x74,0x65,0x6d,0x73]
var data3 = [0x18,0x99,0x01,0x05,0x00,0x00,0x42,0x07,0x33,0x32,0x30,0x30,0x2d,0x67,0x62];

var buffer = Buffer.from(data3);
var reader = new BufferReader(buffer);
reader.seek(1);
var id = reader.nextUInt8();
var command = reader.nextUInt8();
console.log("id: %s command %d", id.toString(16), command);
if (id != 0x99 || command != 0x01) {
    console.log("invalid id or command");
    process.exit(0);
}

var attr1a = reader.nextUInt8();
var attr1b = reader.nextUInt8();
var attr1c = reader.nextUInt8();
if (attr1b != 0x00 ) {
    console.log("invalid data attribute");
    process.exit(0);
}

if (attr1c != 0x00) {
    console.log("invalid status");
    process.exit(0);
}

if (attr1a == 0x03) {
    var datatype = reader.nextUInt8();
    if (datatype != 0x20) {
        console.log("data type for 0003 is NOT UInt8(0x20)");
        process.exit(0);
    }

    var hardware_version = reader.nextUInt8();
    console.log("hardware_version: %d", hardware_version);
}
else if (attr1a == 0x04) {
    var datatype = reader.nextUInt8();
    if (datatype != 0x42) {
        console.log("data type for 0004 is NOT string (0x42)");
        process.exit(0);
    }

    reader.nextUInt8();
    var strbuffer = reader.restAll();
    var manufacturer = strbuffer.toString('utf8');
    console.log("manufacturer: %s", manufacturer);
}
else if (attr1a == 0x05) {
    var datatype = reader.nextUInt8();
    if (datatype != 0x42) {
        console.log("data type for 0005 is NOT string (0x42)");
        process.exit(0);
    }

    reader.nextUInt8();
    var strbuffer = reader.restAll();
    var modelid = strbuffer.toString('utf8');
    console.log("modelid: %s", modelid);
}

process.exit(0);

var value = reader.nextBuffer(3);
console.log(util.inspect(value));

if (value[0] == 0x03 && value[1] == 0x00 && value[2] == 0x00) {
    console.log("attribute 0003 found" );
}

var datatype = reader.nextUInt8();
if (datatype == 0x20) {
    console.log("data type for 0003 is Unit8");
}

var hardware_version = reader.nextUInt8();
console.log("hardware_version: %d", hardware_version);

value = reader.nextBuffer(3);
console.log(util.inspect(value));

if (value[0] == 0x04 && value[1] == 0x00 && value[2] == 0x00) {
    console.log("attribute 0004 found");
}

datatype = reader.nextUInt8();
if (datatype == 0x42) {
    console.log("data type for 0004 is %s", datatype.toString(16));
}

// finf where is the 0005
var attr5start = 0;
var pos = reader.tell();
for (var i = pos; i < buffer.length; i++) {
    if (buffer[i] == 0x05 && buffer[i + 1] == 0x00 && buffer[i + 2] == 0x00) {
        // that is 0500
        attr5start = i;
        break;
    }
}

if (attr5start) {
    console.log("attribute 0005 start at %d", attr5start);
}

if (datatype == 0x42) {
    var take = attr5start - pos -1;
    reader.nextUInt8()
    value = reader.nextBuffer(take);
    var manufacturer = value.toString('utf8');
    console.log("manufacturer: %s", manufacturer);
}

if (!attr5start) {
    console.log("coldn't find attr 0005");
    process.exit(0);
}

reader.seek(attr5start + 3);
datatype = reader.nextUInt8();
console.log("data type for 0005 is %s", datatype.toString(16));
if (datatype == 0x42) {
    console.log("data type for 0005 is %s", datatype.toString(16));
    pos = reader.tell();
    take = buffer.length - pos;
    value = reader.nextBuffer(take);
    var modelid = value.toString('utf8');
    console.log("modelid: %s", modelid);
}

process.exit(0);

var valuebuf = reader.nextBuffer(2);
valuebuf.swap16();
var value = valuebuf.readUInt16BE(0);

//console.log(sprintf("%04x", 0x0b05));
//console.log(sprintf("%04x", 0x0003));
console.log(sprintf("%04x", 0x0000));

//process.exit(0);

*/



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
        baudrate: 9600 //57600 // 115200 //9600
    },
    function (err) {
        if (err) {
            console.log('Serial port error: ', err.message);
        }
    }
);


function swapEUI64toLittleEndian(eui64) {
    if (!eui64 || eui64.length != 16) {
        throw new Error("Invalid EUI64 data. EUI64 must be an 16 charecter long string");
    }

    var buffer = Buffer.from(eui64, "hex");
    var final = Buffer.alloc(8);
    var index = 0;
    for (let i = buffer.length - 1; i >= 0; i--) {
        final[index++] = buffer[i];
    }

    return final;
}

function swapEUI64BuffertoBigEndian(eui64) {
    if (!eui64 || eui64.length != 8 || !Buffer.isBuffer(eui64)) {
        throw new Error("Invalid EUI64 buffer, eui64 param must be a 8 byte lenght buffer");
    }

    var final = Buffer.alloc(8);
    var index = 0;
    for (let i = eui64.length - 1; i >= 0; i--) {
        final[index++] = eui64[i];
    }

    return final;
}


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
        data: [0x01, 0x69, 0x02]
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
        data: [0x01, 0x67, 0x00]
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
        data: [0x01, 0x68, 0x01]
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


function read_report_configuration(address64, address16, sourceend, destend) {
    console.log("read_report_configuration at " + address64);
    var txframe = { // AT Request to be sent to     
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: 0x0006,
        profileId: 0x0104,
        data: [0x00, 0xdc, 0x08, 0x00, 0x00]
    };

    serialport.write(xbee.buildFrame(txframe));
}



function iaszone_enroll(address64, address16, sourceend, destend, data ) {
    console.log("iaszone_enroll");
    var txframe = { // AT Request to be sent to 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: 0x0500,
        profileId: 0x0104,
        data: data 
    };

    serialport.write(xbee.buildFrame(txframe));
}


function iaszone_enroll_response(address64, address16, sourceend, destend) {
    console.log("iaszone_enroll_response");
    var txframe = { // AT Request to be sent to 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: 0x0500,
        profileId: 0x0104,
        data: [0x01, 0x34, 0x00, 0x00, 0x00] //  0x00 = Zone Id
    };

    serialport.write(xbee.buildFrame(txframe));
}

function configure_reports(txn, address64, address16, sourceend, destend, cluster, reports) {    

    var len = 3; // frame control, txn and command -> 3 bytes
    var report_buffers = [];

    function add_report_item(report) {
        var attribute = report.attribute,
            datatype = report.datatype,
            mininterval = report.mininterval,
            maxinterval = report.maxinterval,
            reportable_change = report.reportable_change;

        var reportbuf = Buffer.alloc(8);
        reportbuf.writeUInt8(0x00, 0);              // direction 0x00
        reportbuf.writeUIntLE(attribute, 1, 2);     // attribute
        reportbuf.writeUInt8(datatype, 3);          // data type e.g 0x10 boolean
        reportbuf.writeUIntLE(mininterval, 4, 2);
        reportbuf.writeUIntLE(maxinterval, 6, 2);
        if (reportable_change) {
            if (datatype == 0x21 || datatype == 0x29) {
                var newbuf = Buffer.alloc(10);
                reportbuf.copy(newbuf);
                newbuf.writeUInt16LE(reportable_change, 8, 2);
                reportbuf = newbuf;
            }
        }
        len += reportbuf.length;
        report_buffers.push(reportbuf);
    }

    reports.forEach(
        (report) => {
            add_report_item(report);
        }
    );

    var command = 0x06;

    var reportbuf = Buffer.alloc(len);
    reportbuf.writeUInt8(0x00, 0);              // frame control
    reportbuf.writeUInt8(txn, 1);               // txn
    reportbuf.writeUInt8(command, 2);           // command 0x06 for Configure report   

    var offset = 3;
    for (let i = 0; i < report_buffers.length; i++) {
        let size = report_buffers[i].length
        report_buffers[i].copy(reportbuf, offset);
        offset += size;
    }
    
    console.log("configure reporting at " + address64 + " buffer: " + util.inspect(reportbuf));

    //var data = [0x00, 0xdd, 0x06, 0x00, 0x00, 0x00, 0x10, 0x10, 0x00, 0x80, 0x00];
    //console.log(util.inspect(data));

    var txframe = { // AT Request to be sent to     
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend,
        clusterId: cluster, //0x0006,
        profileId: 0x0104,
        data: reportbuf
    };

    serialport.write(xbee.buildFrame(txframe));
}

function configure_report(txn, address64, address16, sourceend, destend, cluster, attribute, datatype, mininterval, maxinterval, reportable_change) {

    /*
    const reportbuf = Buffer.alloc(11);
    reportbuf.writeUInt8(0x00, 0);  // frame control
    reportbuf.writeUInt8(txn, 1);  
    reportbuf.writeUIntLE(cluster, 2, 2);
    reportbuf.writeUIntLE(attribute, 4, 2);
    reportbuf.writeUInt8(datatype, 6);
    reportbuf.writeUIntLE(mininterval, 7, 2);
    reportbuf.writeUIntLE(maxinterval, 9, 2);
    //var reportdata = [...reportbuf];
    console.log("configure reporting at " + address64 + " buffer: " + util.inspect(reportbuf));

    //var data = [0x00, 0xdd, 0x06, 0x00, 0x00, 0x00, 0x10, 0x10, 0x00, 0x80, 0x00];
    //console.log(util.inspect(data));
    */

    var command = 0x06;

    var reportbuf = Buffer.alloc(11);
    reportbuf.writeUInt8(0x00, 0);              // frame control
    reportbuf.writeUInt8(txn, 1);               // txn
    reportbuf.writeUInt8(command, 2);           // command 0x06 for Configure report   
    reportbuf.writeUInt8(0x00, 3);              // direction 0x00
    reportbuf.writeUIntLE(attribute, 4, 2);     // attribute
    reportbuf.writeUInt8(datatype, 6);          // data type e.g 0x10 boolean
    reportbuf.writeUIntLE(mininterval, 7, 2);
    reportbuf.writeUIntLE(maxinterval, 9, 2);
    if (reportable_change) {
        if (datatype == 0x21 || datatype == 0x29) {
            var newbuf = Buffer.alloc(13);
            reportbuf.copy(newbuf);
            newbuf.writeUInt16LE(reportable_change, 11, 2);
            reportbuf = newbuf;
        }
    }
    console.log("configure reporting at " + address64 + " buffer: " + util.inspect(reportbuf));

    //var data = [0x00, 0xdd, 0x06, 0x00, 0x00, 0x00, 0x10, 0x10, 0x00, 0x80, 0x00];
    //console.log(util.inspect(data));

    var txframe = { // AT Request to be sent to     
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        sourceEndpoint: sourceend,
        destinationEndpoint: destend, 
        clusterId: cluster, //0x0006,
        profileId: 0x0104, 
        data: reportbuf

        
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

function find_neighbor_table(address64, index) {
    var txframe = { // AT Request to be sent to 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: 'fffe', 
        clusterId: 0x0031,
        profileId: 0x0000,
        data: [0x03, index]
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


function match_descriptor_request(address64, address16, data) {
    console.log("match_descriptor_request");
    var txframe = {
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: address64,
        destination16: address16,
        clusterId: 0x0006,
        profileId: 0x0000,
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        data: data
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
    console.log("active_endpoint_request to " + address64);
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
    var txframe = {  
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


// Network Address Request
function network_address_request(address64) {
    console.log("simple_descriptor_request");

    var addressbuf = swapEUI64toLittleEndian(address64);  
    const narbuf = Buffer.alloc(10);
    narbuf.writeUInt8(0x03, 0); // 0x03 transaction sequence number (arbitrarily chosen) 
    addressbuf.copy(narbuf, 1);
    narbuf.writeUInt8(0x00, 9); // Request Type 

    console.log("Network Address Request ClusterID=0x0000 buffer: " + util.inspect(narbuf));    

    var txframe = {
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: "000000000000ffff",
        destination16: "fffe",
        clusterId: 0x0000,
        profileId: 0x0000,
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        data: narbuf
    };

    serialport.write(xbee.buildFrame(txframe));
}



function send_binding(frame, gateway64, clusterid, deviceendpoint, myendpoint, myshortaddress) {

    /*

    Octets:     8               1           2               1               2/8             0/1
    Data:       SrcAddress      SrcEndp     ClusterID       DstAddrMode     DstAddress      DstEndp

    */

    //var clusterbuf = Buffer.from(clusterid, 'hex');
    //clusterbuf.swap16();
    //console.log(util.inspect(clusterbuf));

    //var dest16 = frame.remote16;
    //var dest16buf = Buffer.from(dest16, 'hex');
    //dest16buf.swap16();

    //var addressbuf = Buffer.from(source64, 'hex');
    //addressbuf.swap32();

    //const bindingbuf = Buffer.alloc(15);
    //bindingbuf.writeUInt8(0x50, 0); // 0x50 transaction sequence number (arbitrarily chosen) 
    //// write the source address 
    //addressbuf.copy(bindingbuf, 1);
    //// write the source endpoint
    //bindingbuf.writeUInt8(MYENDPOINT, 9); // MYENDPOINT = 0x02
    //// write the cluster id
    //clusterbuf.copy(bindingbuf, 10, 0);
    //// write the DstAddrMode
    //bindingbuf.writeUInt8(0x01, 12); // 0x01 = 16-bit group address for DstAddress and DstEndp not present; 0x03 64-bit extended address for DstAddress and DstEndp present
    //// write the DstAddress
    //dest16buf.copy(bindingbuf, 13);

    //var dest64 = gateway64;
    //var dest64buf = Buffer.from(dest64, 'hex');
    //dest64buf.swap32();

    //var source_addressbuf = Buffer.from(frame.remote64, 'hex');
    //source_addressbuf.swap32();

    //source_endpoint = source_endpoint;

    //const bindingbuf = Buffer.alloc(22);
    //bindingbuf.writeUInt8(0x50, 0); // 0x50 transaction sequence number (arbitrarily chosen) 
    //// write the source address 
    //source_addressbuf.copy(bindingbuf, 1);
    //// write the source endpoint
    //bindingbuf.writeUInt8(source_endpoint, 9); // 
    //// write the cluster id
    //clusterbuf.copy(bindingbuf, 10, 0);
    //// write the DstAddrMode
    //bindingbuf.writeUInt8(0x03, 12); // 0x01 = 16-bit group address for DstAddress and DstEndp not present; 0x03 64-bit extended address for DstAddress and DstEndp present
    //// write the DstAddress
    //dest64buf.copy(bindingbuf, 13);
    //bindingbuf.writeUInt8(destination_endpoint, 21); // 


    //var dest16 = frame.remote16;
    //var dest16 = 0x0000;
    //var dest16buf = Buffer.from(dest16, 'hex');
    //dest16buf.swap16();

    var source64 = swapEUI64toLittleEndian(frame.remote64);
    var srcendpoint = deviceendpoint;

    var destaddress16 = myshortaddress;
    var destendpoint = myendpoint;    

    var dest64buf = swapEUI64toLittleEndian(gateway64);
    
    /*
    var source_addressbuf = Buffer.from(gateway64, 'hex');
    source_addressbuf.swap32();
    var srcendpoint = myendpoint;

    var destaddress16 = frame.remote16;
    var destendpoint = deviceendpoint;
    */

    /*
    const bindingbuf = Buffer.alloc(15);
    bindingbuf.writeUInt8(0x51, 0); // 0x50 transaction sequence number (arbitrarily chosen) 
    // write the source address 
    source_addressbuf.copy(bindingbuf, 1);
    // write the source endpoint
    bindingbuf.writeUInt8(srcendpoint, 9); // 
    // write the cluster id
    bindingbuf.writeUInt16LE(clusterid, 10, 2);
    // write the DstAddrMode
    bindingbuf.writeUInt8(0x01, 12); // 0x01 = 16-bit group address for DstAddress and DstEndp not present; 0x03 64-bit extended address for DstAddress and DstEndp present
    // write the DstAddress
    bindingbuf.writeUInt16LE(destaddress16, 13, 2);
    */

    const bindingbuf = Buffer.alloc(22);
    bindingbuf.writeUInt8(0x51, 0); // 0x50 transaction sequence number (arbitrarily chosen) 
    //// write the source address 
    source64.copy(bindingbuf, 1);
    //// write the source endpoint
    bindingbuf.writeUInt8(srcendpoint, 9); // 
    //// write the cluster id
    bindingbuf.writeUInt16LE(clusterid, 10, 2);
    //// write the DstAddrMode
    bindingbuf.writeUInt8(0x03, 12); // 0x01 = 16-bit group address for DstAddress and DstEndp not present; 0x03 64-bit extended address for DstAddress and DstEndp present
    //// write the DstAddress
    dest64buf.copy(bindingbuf, 13);
    bindingbuf.writeUInt8(destendpoint, 21); // 
    
    //var arr = [0x51, 0xb6, 0x50, 0xbc, 0x0b, 0x00, 0x6f, 0x0d, 0x00, 0x01, 0x06, 0x00, 0x03, 0x00, 0x9c, 0x67, 0x41, 0x00, 0xa2, 0x13, 0x00, 0x02];
    //const bindingbuf = Buffer.from(arr);
    console.log("Bind_req ClusterID=0x0021 buffer: " + util.inspect(bindingbuf));    

    var txframe = { 
        type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
        destination64: frame.remote64, // //frame.remote64,
        destination16: frame.remote16, //frame.remote16,
        clusterId: 0x0021,
        profileId: 0x0000,
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        data: bindingbuf
    };

    serialport.write(xbee.buildFrame(txframe));
    
}


var is_enroll_sent = false;

function read_ias_cie(frame) {
    const enrollbuf = Buffer.alloc(5);
    enrollbuf.writeUInt8(0x00, 0);
    enrollbuf.writeUInt8(0x25, 1);// 0x25 transaction sequence number (arbitrarily chosen) 
    enrollbuf.writeUInt8(0x00, 2); // read attribute
    enrollbuf.writeUInt16LE(0x0010, 3); // attribute identifier
    //var enrolldata = [...enrollbuf];
    console.log("IAS Zone enroll read request buffer: " + util.inspect(enrollbuf));
    //console.log("IAS Zone enroll read request data: " + util.inspect(enrolldata));
    iaszone_enroll(frame.remote64, frame.remote16, 2, 1, enrollbuf);
}

function enroll_to_ias(frame) {
    setTimeout(
        () => {

            if (!is_enroll_sent) {

                const enrollbuf = Buffer.alloc(14);
                enrollbuf.writeUInt8(0x00, 0);
                enrollbuf.writeUInt8(0x33, 1);// 0x22 transaction sequence number (arbitrarily chosen) 
                enrollbuf.writeUInt8(0x02, 2); // write attribute
                enrollbuf.writeUInt16LE(0x0010, 3); // attribute identifier
                enrollbuf.writeUInt8(0xf0, 5); // 0xf0 data type
                var addressbuf = Buffer.from('0013a20041679c00', 'hex');
                addressbuf.swap32();
                addressbuf.copy(enrollbuf, 6);
                //var enrolldata = [...enrollbuf];
                console.log("IAS Zone enroll write request buffer: " + util.inspect(enrollbuf));
                iaszone_enroll(frame.remote64, frame.remote16, 2, 1, enrollbuf);

                setTimeout(
                    () => {
                        iaszone_enroll_response(frame.remote64, frame.remote16, 2, 1);
                    },
                    50
                );               

                is_enroll_sent = true;
            }

            setTimeout(
                () => {

                    const enrollbuf = Buffer.alloc(5);
                    enrollbuf.writeUInt8(0x00, 0);
                    enrollbuf.writeUInt8(0x25, 1);// 0x25 transaction sequence number (arbitrarily chosen) 
                    enrollbuf.writeUInt8(0x00, 2); // read attribute
                    enrollbuf.writeUInt16LE(0x0010, 3); // attribute identifier
                    //var enrolldata = [...enrollbuf];
                    console.log("IAS Zone enroll read request buffer: " + util.inspect(enrollbuf));
                    iaszone_enroll(frame.remote64, frame.remote16, 2, 1, enrollbuf);

                },
                3000
            );

        },
        1000
    );
}


serialport.on("open", function (err) {
    if (err) {
        return console.log('Error opening port: ', err.message);
    }

    console.log('serial port ON open');

    setTimeout(
        () => {
            console.log('send ZDO 0x0032');
            var txframe = { // AT Request to be sent to 
                type: C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME,
                clusterId: 0x0032,
                profileId: 0x0000,
                sourceEndpoint: 0x00,
                destinationEndpoint: 0x00, 
                data: [0x02, 0x00]
            };

            serialport.write(xbee.buildFrame(txframe));
        },
        1000
    );


    //setTimeout(
    //    () => {
    //        find_neighbor_table('0013a20041679c00', 0);
    //    },
    //    1000
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
                console.log(util.inspect(frame));
                if (frame.remote64.toUpperCase() == "0013A20041679C00") {

                    network_address_request("000d6f000b2d653f");

                    /*                    
                    */
                }
                else if (frame.remote64.toUpperCase() == "000D6F000BBC50B6") {
                    /*
                    console.log("send Match Descriptor Request cluster ID 0x0006 to " + frame.remote64);

                    var address16num = parseInt(frame.remote16, 16);

                    const mdrbuf = Buffer.alloc(10);
                    mdrbuf.writeUInt8(0x02, 0); // transaction sequence number (arbitrarily chosen)
                    mdrbuf.writeUInt16LE(address16num, 1, 2);
                    mdrbuf.writeUInt16LE(0x0104, 3, 2);
                    mdrbuf.writeUInt8(0x00, 5);
                    mdrbuf.writeUInt8(0x00, 6);
                    mdrbuf.writeUInt8(0x01, 7);
                    mdrbuf.writeUInt16LE(0x0006, 8, 2);
                    //var mdrdata = [...mdrbuf];
                    console.log("Match Descriptor Request data: " + util.inspect(mdrbuf));
                    match_descriptor_request('000d6f000bbc50b6', 'b282', mdrbuf);
                    */

                    var device_endpoint = 1; //devdata[frame.remote64].endpoints[0];
                    setTimeout(
                        () => {
                            send_binding(frame, '0013a20041679c00', 0x0006, device_endpoint, MYENDPOINT, 0x000);
                        },
                        1000
                    );

                    var device_endpoint = 1; //devdata[frame.remote64].endpoints[0];
                    setTimeout(
                        () => {
                            send_binding(frame, '0013a20041679c00', 0x0b04, device_endpoint, MYENDPOINT, 0x000);
                        },
                        1000
                    );

                    
                    setTimeout(
                        () => {
                            var cluster = 0x0006;
                            var attribute = 0x0000, datatype = 0x10, mininterval = 0x02, maxinterval = 0x001e;
                            var reports = [];
                            reports.push(
                                {
                                    attribute: attribute,
                                    datatype: datatype,
                                    mininterval: mininterval,
                                    maxinterval: maxinterval
                                }
                            );
                            configure_reports(0xd1, frame.remote64, frame.remote16, MYENDPOINT, device_endpoint, reports);
                        },
                        3000
                    );

                    // 0b04 data type 0x29 power attr 0x050B
                    // 0b04 data type 0x21 voltage attr 0x0505 

                    /*
                    setTimeout(
                        () => {
                            var cluster = 0x0b04, attribute = 0x050b, datatype = 0x29, mininterval = 0x03, maxinterval = 0x0030, reportable_change = 0x0002;
                            configure_report(0xd2, frame.remote64, frame.remote16, MYENDPOINT, device_endpoint, cluster, attribute, datatype, mininterval, maxinterval, reportable_change);
                        },
                        4000
                    );

                    setTimeout(
                        () => {
                            var cluster = 0x0b04, attribute = 0x0505, datatype = 0x21, mininterval = 0x03, maxinterval = 0x0031, reportable_change = 0x0003;
                            configure_report(0xd3, frame.remote64, frame.remote16, MYENDPOINT, device_endpoint, cluster, attribute, datatype, mininterval, maxinterval, reportable_change);
                        },
                        5000
                    );
                    */
                }
            }
            else if (frame.clusterId == "8000") {

                console.log(util.inspect(frame));

                var reader = new BufferReader(frame.data);
                var id = reader.nextUInt8();
                var status = reader.nextUInt8();
                if (status != 0x00) {
                    return;
                }

                var ieebuf = reader.nextBuffer(8);
                var swapped = swapEUI64BuffertoBigEndian(ieebuf);
                var ieeestr = swapped.toString("hex")
                console.log("IEEE: " + ieeestr);

                var address16 = reader.nextUInt16LE();
                var address16str = sprintf("%02x", address16)
                console.log("network address: " + address16str);

                // send Active Endpoint Request 0x0005
                var addressbuf = Buffer.from(address16str, 'hex');
                addressbuf.swap16();
                const aerbuf = Buffer.alloc(3);
                aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
                addressbuf.copy(aerbuf, 1);
                console.log("Active Endpoint Request data: " + util.inspect(aerbuf));
                active_endpoint_request(ieeestr, address16str, aerbuf);

                //
            }
            else if (frame.clusterId == "8006") {
                
                console.log(util.inspect(frame));

                var bufflen = frame.data.length;
                var reader = new BufferReader(frame.data);
                var id = reader.nextUInt8();
                var status = reader.nextUInt8();
                var address = reader.nextUInt16LE();
                var matchnum = reader.nextUInt8();
                var endpoint = reader.nextUInt8();

                var endpoints = [];
                endpoints.push(endpoint);
                console.log("endpoints: " + util.inspect(endpoints));

                // send Active Endpoint Request 0x0005
                var addressbuf = Buffer.from(frame.remote16, 'hex');
                addressbuf.swap16();
                const aerbuf = Buffer.alloc(3);
                aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
                addressbuf.copy(aerbuf, 1);
                //var aerdata = [...aerbuf];
                console.log("Active Endpoint Request data: " + util.inspect(aerbuf));
                active_endpoint_request(frame.remote64, frame.remote16, aerbuf);

                //
            }
            else if (frame.clusterId == "8020") {
                console.log(util.inspect(frame));
            }
            else if (frame.clusterId == "8031") {
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
                    console.log("addressbuf: " + util.inspect(addressbuf));
                    addressbuf.swap64();
                    var address64 = addressbuf.toString("hex");
                    console.log("address64: %s", address64);
                    var shortaddrbuf = reader.nextBuffer(2);
                    console.log("shortaddrbuf: " + util.inspect(shortaddrbuf));
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

                    var mac = address64.toLowerCase();
                    devicelist.update(mac, true);

                    // send Active Endpoint Request 0x0005
                    //var addressbuf = Buffer.from(frame.remote16, 'hex');
                    //addressbuf.swap16();
                    const aerbuf = Buffer.alloc(3);
                    aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
                    shortaddrbuf.swap16();
                    shortaddrbuf.copy(aerbuf, 1);
                    //var aerdata = [...aerbuf];
                    console.log("Active Endpoint Request data: " + util.inspect(aerbuf));
                    active_endpoint_request(address64, address16, aerbuf);

                    //
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
                //console.log(util.inspect(frame));

                var reader = new BufferReader(frame.data);
                reader.seek(2);
                var zcl_command = reader.nextUInt8();
                console.log("zcl_command: %s", sprintf("0x%02x", zcl_command));

                if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
                    // get the attributes
                    var attribute = reader.nextUInt16LE();
                    console.log("attribute: %s", sprintf("0x%04x", attribute));

                    if (attribute == 0x050b) { // active power 
                        var datatype = reader.nextUInt8();

                        if (datatype != 0x29) {
                            return;
                        }

                        var value = reader.nextInt16LE();
                        console.log("power: %d Watts", value);
                    }

                    if (attribute == 0x0505) { // active power 
                        var datatype = reader.nextUInt8();

                        if (datatype != 0x21) {
                            return;
                        }

                        var value = reader.nextInt16LE();
                        console.log("power: %d Volt", value);
                    }
                }

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
                reader.seek(2);
                var zcl_command = reader.nextUInt8();
                console.log("zcl_command: %s", sprintf("0x%02x", zcl_command));

                if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
                    // get the attributes
                    var attribute = reader.nextUInt16LE();
                    console.log("attribute: %s", sprintf("0x%04x", attribute));

                    if (attribute == 0x000) { // active power 
                        var datatype = reader.nextUInt8();

                        if (datatype != 0x29) {
                            return;
                        }

                        var value = reader.nextInt16LE();
                        value = value * 0.01;
                        console.log("temperature: %f Celsius", value);
                    }                   
                }

                /*
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
                */

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
                //console.log(util.inspect(frame));

                if (frame.profileId == "0000") {

                    //is_enroll_sent = false;

                    devdata[frame.remote64] = { endpoints: 0, clusters: 0 };

                    var reader = new BufferReader(frame.data);
                    var id = reader.nextUInt8();

                    //var valuebuf = reader.nextBuffer(2);
                    //valuebuf.swap16();
                    //var destaddress = valuebuf.readUInt16BE(0);
                    myaddress16 = reader.nextUInt16LE();

                    console.log("id: %s, dest: %s", id.toString(16), myaddress16.toString(16));

                    valuebuf = reader.nextBuffer(2);
                    valuebuf.swap16();
                    var requested_profile = valuebuf.readUInt16BE(0);
                    console.log("requested profile: %s", requested_profile.toString(16));

                    var number_of_input_clusters = reader.nextUInt8();
                    console.log("number_of_input_clusters: %d", number_of_input_clusters);

                    // reply with 8006
                    const respbuf = Buffer.alloc(6);
                    respbuf.writeUInt8(0x11, 0); // transaction sequence number (arbitrarily chosen)
                    respbuf.writeUInt8(0x00, 1); // status
                    respbuf.writeUInt16LE(0x0000, 2, 2); // Indicates the 16-bit address of the responding device, this is the coordinator with address 0x0000
                    respbuf.writeUInt8(0x01, 4); // 1 endpoint
                    respbuf.writeUInt8(MYENDPOINT, 5); // set endpoint tp 0x02
                    //var response = [...respbuf];
                    console.log("match descriptor response data: " + util.inspect(respbuf));
                    match_descriptor_response(frame.remote64, frame.remote16, respbuf); 

                    // send Active Endpoint Request 0x0005
                    var addressbuf = Buffer.from(frame.remote16, 'hex');
                    addressbuf.swap16();
                    const aerbuf = Buffer.alloc(3);
                    aerbuf.writeUInt8(0x12, 0); // 0x12 transaction sequence number (arbitrarily chosen)                        
                    addressbuf.copy(aerbuf, 1);
                    //var aerdata = [...aerbuf];
                    console.log("Active Endpoint Request data: " + util.inspect(aerbuf));
                    setTimeout(
                        () => {
                            active_endpoint_request(frame.remote64, frame.remote16, aerbuf);
                        },
                        1000
                    );
                        
                }
                else if (frame.profileId == "0104") {

                    var reader = new BufferReader(frame.data);
                    reader.seek(2);
                    var zcl_command = reader.nextUInt8();
                    console.log("zcl_command: %s", sprintf("0x%02x", zcl_command));

                    if (zcl_command == 0x0a) {  // ZCL 0x0a Report attributes 7.11
                        // get the attributes
                        var attribute = reader.nextUInt16LE();
                        console.log("attribute: %s", sprintf("0x%04x", attribute));

                        if (attribute == 0x0000) { // active power 
                            var datatype = reader.nextUInt8();

                            if (datatype != 0x10) {
                                return;
                            }

                            var value = reader.nextUInt8();
                            console.log("switch status: %s", value == 0 ? "OFF" : "ON");
                        }

                    }

                    /*
                    var reader = new BufferReader(frame.data);
                    var curpos = 0;
                    var status, command, id;
                    reader.seek(1);
                    curpos = reader.tell();
                    if (curpos < frame.data.length) {
                        id = reader.nextUInt8();
                    }
                    curpos = reader.tell();
                    if (curpos < frame.data.length) {
                        command = reader.nextUInt8();
                    }
                    curpos = reader.tell();
                    if (curpos < frame.data.length) {
                        status = reader.nextUInt8();
                    }

                    console.log("id: %s, command: %d, status: %d", id.toString(16), command, status);
                    //if (id == 0xdd && command == 0x07) {
                    //    console.log("response to report write received with status " + status);
                    //}
                    */
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

                devdata[frame.remote64] = { endpoints: 0, clusters: 0 };

                // reply with 0x0005
                var addressbuf = Buffer.from(frame.remote16, 'hex');
                addressbuf.swap16();
                const aerbuf = Buffer.alloc(3);
                aerbuf.writeUInt8(0x12, 0); // transaction sequence number (arbitrarily chosen)                        
                addressbuf.copy(aerbuf, 1);
                ///var aerdata = [...aerbuf];
                console.log("Active Endpoint Request data: " + util.inspect(aerbuf));
                active_endpoint_request(frame.remote64, frame.remote16, aerbuf);


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

                    console.log("id: %s, status: %d, address16: %s", id.toString(16), status, destaddress.toString(16));

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
                        devdata[frame.remote64] = { endpoints: endpoints };
                    }
                    console.log(frame.remote64 + " devdata: " + util.inspect(devdata[frame.remote64]));

                    // reply with 0004 Simple Descriptor Request
                    var addressbuf = Buffer.from(frame.remote16, 'hex');
                    addressbuf.swap16();
                    const sdrbuf = Buffer.alloc(4);
                    sdrbuf.writeUInt8(0x15, 0); // 0x15 transaction sequence number (arbitrarily chosen)                        
                    addressbuf.copy(sdrbuf, 1);
                    // send to the first endpoint
                    var endp = endpoints[0];
                    sdrbuf.writeUInt8(endp, 3);
                    //var sdrdata = [...sdrbuf];
                    console.log("Simple Descriptor Request data: " + util.inspect(sdrbuf));
                    simple_descriptor_request(frame.remote64, frame.remote16, sdrbuf);
                }
            }
            else if (frame.clusterId == "0019") {
                //console.log(util.inspect(frame));
            }
            else if (frame.clusterId == "0500") {
                console.log(util.inspect(frame));
            }
            else if (frame.clusterId == "8021") {
                console.log(util.inspect(frame));
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

                var is0500 = false;
                var is0B04 = false;
                var is0006 = false;
                var is0402 = false;
                clusters.forEach(
                    (item) => {
                        switch (item) {
                            case "0500":
                                is0500 = true;
                                break;
                            case "0B04":
                                is0B04 = true;
                                break;
                            case "0006":
                                is0006 = true;
                                break;
                            case "0402":
                                is0402 = true;
                                break;
                            default:
                                break;
                        }
                    }
                );

                if (is0500) {
                    //send_binding(frame, '0013a20041679c00', '0500', devdata[frame.remote64].endpoints[0], MYENDPOINT);

                    //setTimeout(
                    //    () => {
                    //        enroll_to_ias(frame);   
                    //    },
                    //    1000
                    //);

                    ////
                    //setTimeout(
                    //    () => {
                    //        read_ias_cie(frame);
                    //    },
                    //    2000
                    //);                        
                }   

                if (is0006) {
                    


                }

                if (is0402) {
                    console.log("0402 cluster exists");

                    var device_endpoint = 1; //devdata[frame.remote64].endpoints[0];
                    setTimeout(
                        () => {
                            send_binding(frame, '0013a20041679c00', 0x0402, device_endpoint, MYENDPOINT, 0x000);
                        },
                        1000
                    );

                    // attribute 0x0000 Measured Value data type 0x29 

                    setTimeout(
                        () => {
                            var cluster = 0x0402, attribute = 0x0000, datatype = 0x29, mininterval = 0x05, maxinterval = 0x003c, reportable_change = 0x0001;
                            configure_report(0xd5, frame.remote64, frame.remote16, MYENDPOINT, device_endpoint, cluster, attribute, datatype, mininterval, maxinterval, reportable_change);
                        },
                        4000
                    );
                    
                }


                if (is0B04) {
                    
                }

               
            }
        }
        
        if (frame.type == 139) {
            //console.log(util.inspect(frame));
        }
        
        
    }
    catch (err) {
        console.log("on frame_object error: ", err);
    }    
});
