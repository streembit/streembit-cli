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


var inherits = require('util').inherits;
var events = require('events');

inherits(AppEvents, events.EventEmitter);

function AppEvents() {
    
    this.APPEVENT = "streembit-app-event";

    this.TYPES = {
        ONAPPNAVIGATE: "onAppNavigate",
        ONUSERINIT: "onUserInitialize",
        ONUSERPUBLISH: "onUserPublish",
        ONDATAPUBLISH: "onDataPublish",
        ONCALLWEBRTCSIGNAL: "onCallWebrtcSignal",               //  For video/audio calls
        ONCALLWEBRTC_SSCSIG: "onCallWebrtcSscSig",              //  For screeen share
        ONCALLWEBRTC_SSAUDIOSIG: "onCallWebrtcSsAudioSig",      //  For screeen share audio call signals
        ONFILEWEBRTCSIGNAL: "onFileWebrtcSignal",
        ONVIDEOCONNECT: "onVideoConnect",
        ONTEXTMSG: "onTextMsg",
        ONPEERMSG: "onPeerMsg",
        ONACCOUNTMSG: "onAccountMsg",
        ONPEERERROR: "onPeerError",
        ONFCHUNKSEND: "onFileChunkSend",
        ONFILECANCEL: "onFileCancel",
        ONINITPROGRESS: "onInitProgress",
        ONIOTCMD: "onIotCmd",                                   //  sends command to device handlers
        ONIOTSEND: "onIoTSend",                                 //  sends back to client IoT related data
        ONIOTEVENT: "onIoTEvent"                                //  sends back to client IoT related data
    };
    
    this.CONTACT_ONLINE = "contact-online";
    this.APP_INIT = "app-init";
    this.APP_UINOTIFY = "app-ui-notify";
    this.UINAVIGATE = "ui-navigate";
    this.APPLOG = "app-log";
    this.CONFIG_UPDATE = "config-update";
    this.TASK_INIT = "task-init";
    this.PEER_WRITE = "peer_write";

    events.EventEmitter.call(this);
}


AppEvents.prototype.appinit = function (route) {
    this.emit(this.APP_INIT);
}

AppEvents.prototype.taskinit = function (task, payload) {
    this.emit(this.TASK_INIT, task, payload);
}


AppEvents.prototype.log = function (payload) {
    this.emit(this.APPLOG, payload);
}

AppEvents.prototype.onLog = function (callback) {
    this.on(this.APPLOG, function (payload) {
        callback(payload);
    });
}

AppEvents.prototype.peer_write = function (id, buffer, callback) {
    this.emit(this.PEER_WRITE, id, buffer, callback);
}


var instance;
if (!instance) {
    instance = new AppEvents();
}

module.exports = instance;
