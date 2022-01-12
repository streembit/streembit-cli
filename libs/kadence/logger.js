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
Author: Streembit team
Copyright (C) 2018 The Streembit software development team

Based on
 * @module kadence
 * @license AGPL-3.0
 * @author Gordon Hall https://github.com/bookchin
-------------------------------------------------------------------------------------------------------------------------
*/

'use strict';

import { Transform } from "stream";

/**
 * Logs all incoming messages
 */
class IncomingMessageLogger extends Transform {

    /**
     * @constructor
     * @param {AbstractNode~logger} logger - Logger to use
     */
    constructor(logger) {
        super({ objectMode: true });
        this.logger = logger;
    }

    /**
     * @private
     */
    _transform(data, enc, callback) {
        let [rpc, ident] = data;

        if (!ident.payload.params[0] || !ident.payload.params[1]) {
            return callback();
        }

        if (rpc.payload.method) {
            this.logger.info(
                `received ${rpc.payload.method} (${rpc.payload.id}) from ` +
                `${ident.payload.params[0]} ` +
                `(http://${ident.payload.params[1].hostname}:` +
                `${ident.payload.params[1].port})`
            );
        } else {
            this.logger.info(
                `received response from ${ident.payload.params[0]} to ` +
                `${rpc.payload.id}`
            );
        }

        callback(null, data);
    }

}

/**
 * Logs all outgoing messages
 */
class OutgoingMessageLogger extends Transform {

    /**
     * @constructor
     * @param {AbstractNode~logger} logger - Logger to use
     */
    constructor(logger) {
        super({ objectMode: true });
        this.logger = logger;
    }

    /**
     * @private
     */
    _transform(data, enc, callback) {
        let [rpc,, recv] = data;

        if (!recv[0] || !recv[1]) {
            return callback();
        }

        if (rpc.method) {
            this.logger.info(
                `sending ${rpc.method} (${rpc.id}) to ${recv[0]} ` +
                `(http://${recv[1].hostname}:${recv[1].port})`
            );
        } else {
            this.logger.info(
                `sending response to ${recv[0]} for ${rpc.id}`
            );
        }

        callback(null, data);
    }
}

export {
    IncomingMessageLogger as IncomingMessage,
    OutgoingMessageLogger as OutgoingMessage
};
