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

'use strict';
import { SixLowPanHandler } from './6lowpan/index.js';
import { XbeeHandler } from './zigbee/xbee/index.js';
import { ZigbeeHandler } from './zigbee/index.js';
import { ZWaveHandler } from './zwave/index.js';

export const ProtocolsFactory = {
    initMcu: (protocol, mcu) => {
        try {
            if (!(protocol && mcu)) {
                throw new Error('Missing options');
            }
            switch (protocol) {
                case 'zigbee':
                    if (mcu === 'xbee') {
                        return new XbeeHandler();
                    }
                    break;

                default:
                    break;
            }
        } catch (error) {
            throw new Error("MCU library " + mcu + " error: " + error.message);

        }

    },
    init: (protocol, chipset) => {
        try {
            if (!protocol) {
                throw new Error('Missing protocols');
            }
            switch (protocol) {
                case 'zigbee':
                    return new ZigbeeHandler(protocol, chipset);
                    break;
                case '6lowpan':
                    return new SixLowPanHandler(protocol, chipset);
                    break;
                case 'zwave':
                    return new ZWaveHandler(protocol, chipset);
                    break;

                default:
                    break;
            }
        } catch (error) {
            throw new Error("MCU library " + mcu + " error: " + error.message);

        }

    }
}



