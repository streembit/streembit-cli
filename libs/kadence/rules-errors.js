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

/**
 * @class
 */
class ErrorRules {

    /**
     * Constructs a error rules instance in the context of a
     * {@link AbstractNode}
     * @constructor
     * @param {AbstractNode} node
     */
    constructor(node) {
        this.node = node;
    }

    /**
     * Assumes if no error object exists, then there is simply no method defined
     * @param {error|null} error
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     * @param {AbstractNode~next} next
     */
    methodNotFound(err, request, response, next) {
        if (err) {
            return next();
        }

        response.error('Method not found', -32601);
    }

    /**
     * Formats the errors response according to the error object given
     * @param {error|null} error
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     * @param {AbstractNode~next} next
     */
    internalError(err, request, response, next) {
        response.error(err.message, err.code || -32603);
        next()
    }

}

export default ErrorRules;
