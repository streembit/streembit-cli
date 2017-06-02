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

var streembit = streembit || {};


var logger = require("libs/logger");
var events = require("libs/events");
var constants = require("libs/constants");

class TaskManager {

    constructor() {
    }

    publish_account() {
        logger.debug("start publish account");
    }

    run(callback) {
        try {

            // initialize the task event handler
            events.on(events.TASK_INIT, (task, payload) => {
                switch (task) {
                    case constants.TASK_PUBLISHACCOUNT:
                        this.publish_account();
                        break;
                    default:
                        break;
                }
            });

            callback();
        }
        catch (err) {
            logger.error("task manager error: " + err.message);
        }
    }
}

module.exports = TaskManager;




