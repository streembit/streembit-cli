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
import {
    ZigbeeAlarmFeature,
    ZigbeeEcMeasureFeature,
    ZigbeeHumidityFeature,
    ZigbeeOccupancyFeature,
    ZigbeeSwitchFeature,
    ZigbeeTemperatureFeature
} from './zigbee/index.js';

export const FeatureFactory = {

    init: (protocol, feature_name, deviceid, feature, feature_type, transport) => {
        try {
            if (!(protocol && feature_name)) {
                throw new Error('Missing options');
            }
            switch (protocol) {
                case 'zigbee':
                    switch (feature_name) {
                        case 'alarms':
                            return new ZigbeeAlarmFeature(deviceid, feature, feature_type, transport);
                            break;
                        case 'ecmeasure':
                            return new ZigbeeEcMeasureFeature(deviceid, feature, feature_type, transport);
                            break;
                        case 'humidity':
                            return new ZigbeeHumidityFeature(deviceid, feature, feature_type, transport);
                            break;
                        case 'occupancy':
                            return new ZigbeeOccupancyFeature(deviceid, feature, feature_type, transport);
                            break;
                        case 'switch':
                            return new ZigbeeSwitchFeature(deviceid, feature, feature_type, transport);
                            break;
                        case 'temperature':
                            return new ZigbeeTemperatureFeature(deviceid, feature, feature_type, transport);
                            break;

                        default:
                            break;
                    }
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



