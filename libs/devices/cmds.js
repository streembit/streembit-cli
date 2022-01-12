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
Author: team Streembit
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

import prompt from "prompt";
import util from "util";
import { logger } from "streembit-util";
import IoTDevicesDb from "../database/devicesdb.js";

class DevicesCmds {
    constructor(cmd, callback) {
        this.cmd = cmd;
        this.cb = callback;
        this.devicesDB = new IoTDevicesDb();
    }

    run() {
        logger.info("Run devices commands handler");

        this.command();
    }

    command() {
        const schema = {
            properties: {
                cmd: {
                    description: 'Enter devices command',
                    type: 'string',
                    pattern: /^[a-z]+( [a-z0-9]{1,})?$/i,
                    message: 'Invalid command',
                    required: true
                },
            }
        };

        prompt.message = "";

        prompt.start();

        prompt.get(schema, async (err, result) => {
            if (err) {
                if (err.message === 'canceled') { // ^C
                    return this.cmd.run(this.cb);
                }

                throw new Error(err);
            }

            await this.processInput(result.cmd);
        });
    }

    async processInput(inp) {
        const inp_r = inp.trim().split(/\s+/);
        const cmd = inp_r[0];

        try {
            switch (cmd) {
                case 'list':
                    try {
                        const devices = await this.devicesDB.devices();
                        console.log('\x1b[34m%s\x1b[0m', util.inspect(devices, false, null));
                    } catch (err) {
                        throw new Error(err.message ? err.message : err);
                    }
                    break;
                case 'delete':
                    try {
                        await this.deleteDevice(inp_r[1]);
                        console.log('\x1b[32m%s\x1b[0m', 'device successfully deleted');
                    } catch (err) {
                        throw new Error(err.message ? err.message : err);
                    }
                    break;
                case 'help':
                default:
                    this.helper();
                    break;
            }
            this.command();
        } catch (err) {
            logger.error(err.message);
            console.error('\x1b[31m%s\x1b[0m', '{error}:', err.message);

            this.cmd.run(this.cb);
        }
    }

    deleteDevice(did) {
        return new Promise(async (resolve, reject) => {
            try {
                const device = await this.devicesDB.get_device(did);
                if (typeof device === 'undefined') {
                    return reject('Device not found by provided ID');
                }
            } catch (err) {
                return reject(err);
            }

            try {
                await this.devicesDB.delete_device(did);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    helper() {
        console.group('\x1b[32m', "\nDevice Commands:");
        console.log('\x1b[30m', '-------------------');
        console.log('\x1b[34m', 'list', 'no arguments');
        console.log('\x1b[34m', 'delete', '[MAC address] or [device ID] valid MAC address of a device or device ID as it recorded in the DB ( iotdevid )');
        console.log('\x1b[30m', '-------------------');
        console.groupEnd();
    }
}

export default DevicesCmds;
