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

var path = require('path');
var fs = require('fs');
var winston = require('winston');
var util = require('util');

var logger = 0;

function log_error(err, param) {
    try {
        if (!err) {
            return;
        }

        if (param) {
            var msg = err;
            if (typeof err == 'string') {
                if (err.indexOf("%j") > -1) {
                    //  the Error object is not formated well from the util library
                    //  send only the message field if that is an Eror object
                    if (param.message && (typeof param == "Error" || typeof param == "error" || typeof param == "object" || typeof param == "Object")) {
                        err = err.replace("%j", "%s");
                        msg = util.format(err, param.message);
                    }
                    else if (typeof param == 'string') {
                        err = err.replace("%j", "%s");
                        msg = util.format(err, param);
                    }
                    else if (typeof param == 'number') {
                        err = err.replace("%j", "%d");
                        msg = util.format(err, param);
                    }
                }
                else {
                    msg = util.format(err, param);
                }
            }
            else {
                msg = err;
            }
            if (logger) {
                logger.error(msg);
            }
            else {
                console.log(msg);
            }
            return msg;
        }
        else {
            if (logger) {
                logger.error(err);
            }
            else {
                console.log(err);
            }
            
            return err;
        }
    }
    catch (e) {
        if (err) {
            // still log to the console
            console.log(err.message ? err.message : err);
        }
    }
}

function level_log(level, msg, val1, val2, val3, val4) {
    try {

        function logmsg(level, msg) {
            if (!logger || !logger.log) {
                console.log(msg);;
            }
            else {
                logger.log(level, msg);
            }
        }

        if (msg) {
            if (val1 != undefined && val2 != undefined && val3 != undefined && val4 != undefined) {
                msg = util.format(msg, val1, val2, val3, val4);
                logmsg(level, msg);
            }
            else if (val1 != undefined && val2 != undefined && val3 != undefined) {
                msg = util.format(msg, val1, val2, val3);
                logmsg(level, msg);
            }
            else if (val1 != undefined && val2 != undefined) {
                msg = util.format(msg, val1, val2);
                logmsg(level, msg);
            }
            else if (val1 != undefined) {
                msg = util.format(msg, val1);
                logmsg(level, msg);
            }
            else {
                logmsg(level, msg);
            }

            if (logger.taskbar_info_proc && level == "info") {
                logger.taskbar_info_proc(msg);
            }
        }
    }
    catch (e) {
        if (msg) {
            // still log to the console
            console.log(msg)
        }
    }
}

function log_info(msg, val1, val2, val3, val4) {
    level_log("info", msg, val1, val2, val3, val4);
}

function log_debug(msg, val1, val2, val3, val4) {
    level_log("debug", msg, val1, val2, val3, val4);
}

function log_warn(msg, val1, val2, val3, val4) {
    level_log("warn", msg, val1, val2, val3, val4);
}


function configure(loglevel, logpath, excpath, taskbar_infofn) {
    var transports = [
        new winston.transports.Console({
            level: loglevel,
            json: false,
            colorize: true
        }),
        new (winston.transports.File)({
            filename: logpath,
            level: loglevel,
            json: true,
            maxsize: 4096000, //4MB
            maxFiles: 100,
            tailable: true,
            colorize: false
        })
    ];


    logger = new (winston.Logger)({
        exitOnError: false,
        transports: transports,
        exceptionHandlers: [
            new winston.transports.File({
                filename: excpath,
                json: true
            }),
            new winston.transports.Console({
                level: loglevel,
                json: false,
                colorize: true
            })
        ]
    });

    if (taskbar_infofn) {
        logger.taskbar_info_proc = taskbar_infofn;
    }
}

function init_log(loglevel, logdir, taskbar_infofn, callback) {
    // set logdir to "/logs", if not set
    logdir = logdir || path.join(path.dirname(require.main.filename), 'logs');
    // set logfile
    var logfile = path.join(logdir, 'streembit.log');
    // set the global logs path
    global.logspath = logdir;

    console.log("logger.init logs directory: %s", logdir);

    // create logs directory, if not exists
    try {
        fs.existsSync(logdir) || fs.mkdirSync(logdir);
    } catch (e) {
        console.log("Error in creating logs directory: " + e.message);
        return callback(e.message);
    }

    // rename log file, if exists
    try {
        fs.existsSync(logfile) && fs.renameSync(logfile, path.join(logdir, "/streembit_" + Date.now() + ".log"));
    } catch (e) {
        console.log("Error in renaming log file: " + e.message);
        return callback(e.message);
    }

    configure(loglevel || "debug", logfile, path.join(logdir, 'exception.log'), taskbar_infofn);
    logger.info("logspath: " + logdir);

    return callback();
}

function set_level(newlevel) {
    if (logger && logger.transports) {
        for (var i = 0; i < logger.transports.length; i++) {
            logger.transports[i].level = newlevel;
        }
    }
}

exports.warn = log_warn;
exports.error = log_error;
exports.info = log_info;
exports.debug = log_debug;
exports.init = init_log;
exports.setlevel = set_level;