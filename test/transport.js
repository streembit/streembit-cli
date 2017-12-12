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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


const assert = require('assert');
const expect = require("chai").expect;
const util = require("util");
const res = require('../resolvedir');
const Transport = require('transport/http');
const peerutils = require("libs/peernet/peerutils");
const stutils = require("libs/utils");
const constants = require("libs/constants");
const DiscoverySrvc = require("services/discovery");

var http_config = require("./http_config");

describe("HTTP Transport handler", function () {

    var httptransport;

    before(function (done) {
        var options = {
            port: http_config.port
        };
        httptransport = new Transport(options);
        httptransport.init(done);
    });

    describe("Initialize", function () {

        it("the transport listening variable set to true", function () {
            var islisten = httptransport.islistening;
            assert.equal(true, islisten);
        });

    });

    
    //describe("Pending timeout", function () {

    //    it("The pending message should existst upon add to the pending Map", function (done) { 
    //        var id = Transport.newid;
    //        Transport.add_pending(id, { timestamp: Date.now(), foo: "foo" });
    //        var obj = Transport.get_pending(id);
    //        var exists = obj.foo == "foo";            
    //        Transport.delete_pending(id);
    //        assert.equal(true, exists);
    //        done();
    //    });

    //    it("The pending message should time out and not exists after 25 seconds", function (done) {
    //        this.timeout(40000);
    //        var payload = {
    //            timestamp: Date.now(),
    //            response: {
    //                statusCode: 0,
    //                end: function () { }
    //            }
    //        };
    //        var id = Transport.newid;
    //        Transport.add_pending(id, payload);
    //        setTimeout(
    //            () => {
    //                //console.log("test get_pending " + id);
    //                var obj = Transport.get_pending(id);
    //                //console.log(util.inspect(obj));
    //                var notexists = !obj;
    //                assert.equal(true, notexists);
    //                done();
    //            },
    //            25000
    //        );
    //    });           
        
    //});
    
    describe("Messages", function () {

        it("DISCOVERY message should return an IP address", function (done) {
            var discsrvc = new DiscoverySrvc();
            discsrvc.init();

            var seeds = [{ host: http_config.host, port: http_config.port}];
            peerutils.discovery("", seeds, function (err, ipaddress) {
                isip = stutils.is_ipaddress(ipaddress);;
                assert.equal(true, isip);
                done();
            });            
        });

    });

    after(function () {
        httptransport.close()       
    });

});