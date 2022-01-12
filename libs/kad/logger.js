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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
  
*/

/**
 * Implementation is based on https://github.com/kadtools/kad 
 * Huge thanks to Gordon Hall https://github.com/gordonwritescode & https://github.com/bookchin the author of kad library!
 * @module kad
 * @license GPL-3.0
 * @author Gordon Hall gordon@gordonwritescode.com
 */


'use strict';


import colors from 'colors/safe';



export class Logger {
    /**
    * Kad, by default, prints log messages to the console using pretty-printed
    * status messages. There are different types of messages indicating the nature
    * or severity, `error`, `warn`, `info`, `debug`. You can tell Kad which of these
    * 0 - 4.
    * @constructor
    * @param {Number} level - Log verbosity (0-4)
    * @param {String} prefix - Optional prefix for log output
    */
    constructor(level, prefix) {
        if (!(this instanceof Logger)) {
            return new Logger(level, prefix);
        }

        this.prefix = colors.bold(' :' + (prefix || 'kad') + ': ');
        this.level = level || 0;
        this.types = {
            debug: {
                level: 4,
                color: colors.magenta
            },
            info: {
                level: 3,
                color: colors.blue
            },
            warn: {
                level: 2,
                color: colors.yellow
            },
            error: {
                level: 1,
                color: colors.red
            }
        };

        this.#bindLogTypes();

    }


    /**
     * Sets up log types as instance methods
     */
    #bindLogTypes = function () {
        var self = this;

        Object.keys(this.types).forEach(function (type) {
            self[type] = function () {
                if (self.level >= self.types[type].level) {
                    var prefix = self.prefix + self.types[type].color('{' + type + '}');
                    var args = Array.prototype.slice.call(arguments);

                    args[0] = prefix + ' ' + args[0];

                    console.log.apply(console, args);
                }
            };
        });
    };
}


