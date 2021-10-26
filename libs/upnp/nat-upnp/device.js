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

const axios = require('axios');
const url = require('url');
const fastXmlParser = require('fast-xml-parser');

module.exports = class Device {
  constructor(url) {
    this._description = url;
    this._services = [
      'urn:schemas-upnp-org:service:WANIPConnection:2',
      'urn:schemas-upnp-org:service:WANIPConnection:1',
      'urn:schemas-upnp-org:service:WANPPPConnection:1'
    ];
  }
  async _getXml(url) {
    let once = false;

    const {status, data} = await axios.get(url, {validateStatus: () => true});

    if(fastXmlParser.validate(data) === true) {
      const result = fastXmlParser.parse(data);

      if (status !== 200) {
        throw new Error('Failed to lookup device description' + yJSON.stringify(result['s:Envelope']['s:Body']['s:Fault'], null, 2));
      }

      return result.root;
    } else {
      throw new Error('XML Parse error');
    }
  }
  async getService(types) {
    const info = await this._getXml(this._description);

    const s = this.parseDescription(info).services
      .filter((service) => types.includes(service.serviceType));

    if (s.length === 0 || !s[0].controlURL || !s[0].SCPDURL) {
      throw new Error('Service not found');
    }

    const base = url.parse(info.baseURL || this._description);
    const prefix = (u) => {
      const uri = url.parse(u);

      uri.host = uri.host || base.host;
      uri.protocol = uri.protocol || base.protocol;

      return url.format(uri);
    }

    return {
      service: s[0].serviceType,
      SCPDURL: prefix(s[0].SCPDURL),
      controlURL: prefix(s[0].controlURL)
    };
  }
  parseDescription(info) {
    const services = [];
    const devices = [];

    const toArray = (item) => {
      return Array.isArray(item) ? item : [ item ];
    };

    const traverseServices = (service) => {
      if (!service) return;
      services.push(service);
    }

    const traverseDevices = (device) => {
      if (!device) return;
      devices.push(device);

      if (device.deviceList && device.deviceList.device) {
        toArray(device.deviceList.device).forEach(traverseDevices);
      }

      if (device.serviceList && device.serviceList.service) {
        toArray(device.serviceList.service).forEach(traverseServices);
      }
    }

    traverseDevices(info.device);

    return {
      services: services,
      devices: devices
    };
  }
  async run(action, args = []) {
    const info = await this.getService(this._services);
    const body = '<?xml version="1.0"?>' +
               '<s:Envelope ' +
                 'xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
                 's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
               '<s:Body>' +
                  '<u:' + action + ' xmlns:u=' +
                          JSON.stringify(info.service) + '>' +
                    args.map((args) => {
                      return '<' + args[0]+ '>' +
                             (args[1] === undefined ? '' : args[1]) +
                             '</' + args[0] + '>';
                    }).join('') +
                  '</u:' + action + '>' +
               '</s:Body>' +
               '</s:Envelope>';

    const options = {
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'Content-Length': Buffer.byteLength(body),
        'Connection': 'close',
        'SOAPAction': JSON.stringify(info.service + '#' + action)
      },
      validateStatus: () => true
    };

    var {status, data} = await axios.post(info.controlURL, body, options);


    if(fastXmlParser.validate(data) === true) {
      const result = fastXmlParser.parse(data);

      if (status !== 200) {
        throw new Error(`${action} failed: ` + JSON.stringify(result['s:Envelope']['s:Body']['s:Fault'], null, 2));
      }

      if (result && result['s:Envelope'] && result['s:Envelope']['s:Body']) {
        return result['s:Envelope']['s:Body'];
      } else {
        throw new Error('SOAP Parse error');
      }
    } else {
      throw new Error('XML Parse error');
    }
  }
}
