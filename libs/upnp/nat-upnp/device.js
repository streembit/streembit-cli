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

import { natupnp as nat } from "../index.js";
import request from "request";
import url from "url";
import xml2js from "xml2js";
import { Buffer } from "buffer";

export class Device {
  constructor(url, _logger) {
    this.description = url;
    this.services = [
      "urn:schemas-upnp-org:service:WANIPConnection:1",
      "urn:schemas-upnp-org:service:WANPPPConnection:1",
    ];
    this.logger = _logger;
  }

  create(url, _logger) {
    return new Device(url, _logger);
  }

  static _getXml(url, callback) {
    let once = false;

    const respond = (err, body) => {
      if (once) {
        return;
      }

      once = true;

      callback(err, body);
    };

    request(url, (err, res, body) => {
      if (err) {
        return callback(err);
      }

      if (res.statusCode !== 200) {
        respond(Error("Failed to lookup device description"));
        return;
      }

      const parser = new xml2js.Parser();
      parser.parseString(body, (err, body) => {
        if (err) {
          return respond(err);
        }

        respond(null, body);
      });
    });
  }

  static getService(types, callback) {
    const self = this;

    this._getXml(this.description, (err, info) => {
      if (err) {
        return callback(err);
      }

      const s = self.parseDescription(info).services.filter(function (service) {
        return types.indexOf(service.serviceType) !== -1;
      });

      if (s.length === 0 || !s[0].controlURL || !s[0].SCPDURL) {
        return callback(Error("Service not found"));
      }

      const base = url.parse(info.baseURL || self.description);

      const prefix = (u) => {
        const uri = url.parse(u);
        uri.host = uri.host || base.host;
        uri.protocol = uri.protocol || base.protocol;

        return url.format(uri);
      };

      callback(null, {
        service: s[0].serviceType,
        SCPDURL: prefix(s[0].SCPDURL),
        controlURL: prefix(s[0].controlURL),
      });
    });
  }

  static parseDescription(info) {
    if (!info) {
      return this.logger.debug("upnp invalid info at device parseDescription");
    }

    let services = [],
      devices = [];

    const toArray = (item) => {
      return Array.isArray(item) ? item : [item];
    };

    const traverseServices = (service) => {
      if (!service) {
        return;
      }

      services.push(service);
    };

    const traverseDevices = (device) => {
      if (!device) {
        this.logger.debug("UPnP invalid device at traverseDevices");
        return;
      }

      devices.push(device);

      if (device.deviceList && device.deviceList.device) {
        toArray(device.deviceList.device).forEach(traverseDevices);
      }

      if (device.serviceList && device.serviceList.service) {
        toArray(device.serviceList.service).forEach(traverseServices);
      }
    };

    traverseDevices(info.device);

    return {
      services: services,
      devices: devices,
    };
  }

  static run(action, args, callback) {
    const self = this;

    this.logger.debug("UPnP action: " + action);

    this.getService(this.services, (err, info) => {
      if (err) {
        return callback(err);
      }

      self.logger.debug("UPnP controlURL: " + info.controlURL);

      const body =
        '<?xml version="1.0"?>' +
        "<s:Envelope " +
        'xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
        's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
        "<s:Body>" +
        "<u:" +
        action +
        " xmlns:u=" +
        JSON.stringify(info.service) +
        ">" +
        args
          .map((args) => {
            return (
              "<" +
              args[0] +
              ">" +
              (args[1] === undefined ? "" : args[1]) +
              "</" +
              args[0] +
              ">"
            );
          })
          .join("") +
        "</u:" +
        action +
        ">" +
        "</s:Body>" +
        "</s:Envelope>";

      request(
        {
          method: "POST",
          url: info.controlURL,
          headers: {
            "Content-Type": 'text/xml; charset="utf-8"',
            "Content-Length": Buffer.byteLength(body),
            Connection: "close",
            SOAPAction: JSON.stringify(info.service + "#" + action),
          },
          body: body,
        },
        (err, res, body) => {
          if (err) {
            return callback(err);
          }

          const parser = new xml2js.Parser();
          parser.parseString(body, (err, body) => {
            if (res.statusCode !== 200) {
              return callback(Error("upnp request failed: " + res.statusCode));
            }

            const soapns = nat.utils.getNamespace(
              body,
              "http://schemas.xmlsoap.org/soap/envelope/"
            );
            callback(null, body[soapns + "Body"]);
          });
        }
      );
    });
  }
}

/* 
var device = exports;

function Device(url, _logger) {
    this.description = url;
    this.services = [
        'urn:schemas-upnp-org:service:WANIPConnection:1',
        'urn:schemas-upnp-org:service:WANPPPConnection:1'
    ];
    this.logger = _logger;
};

device.create = function create(url, _logger) {
    return new Device(url, _logger);
};

Device.prototype._getXml = function _getXml(url, callback) {
    var once = false;
    
    function respond(err, body) {
        if (once) {
            return;
        }

        once = true;

        callback(err, body);
    }

    request(url, function(err, res, body) {
        if (err) {
            return callback(err);
        }

        if (res.statusCode !== 200) {
            respond(Error('Failed to lookup device description'));
            return;
        }

        var parser = new xml2js.Parser();
        parser.parseString(body, function(err, body) {
            if (err) {
                return respond(err);
            }

            respond(null, body);
        });
    });
};

Device.prototype.getService = function getService(types, callback) {
    var self = this;

    this._getXml(this.description, function (err, info) {
        if (err)  {
            return callback(err);
        }

        var s = self.parseDescription(info).services.filter(function(service) {
            return types.indexOf(service.serviceType) !== -1;
        });

        if (s.length === 0 || !s[0].controlURL || !s[0].SCPDURL) {
            return callback(Error('Service not found'));
        }

        var base = url.parse(info.baseURL || self.description);
        
        function prefix(u) {
            var uri = url.parse(u);
            uri.host = uri.host || base.host;
            uri.protocol = uri.protocol || base.protocol;

            return url.format(uri);
        }

        callback(null,{
            service: s[0].serviceType,
            SCPDURL: prefix(s[0].SCPDURL),
            controlURL: prefix(s[0].controlURL)
        });

    });
};

Device.prototype.parseDescription = function parseDescription(info) {
    if (!info) {
        return this.logger.debug("upnp invalid info at device parseDescription");
    }

    var services = [],
        devices = [];

    function toArray(item) {
        return Array.isArray(item) ? item : [ item ];
    };

    function traverseServices(service) {
        if (!service) {
            return;
        }

        services.push(service);
    }

    function traverseDevices(device) {
        if (!device) {
            this.logger.debug("UPnP invalid device at traverseDevices");
            return;
        }

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
};

Device.prototype.run = function run(action, args, callback) {
    var self = this;
    
    this.logger.debug("UPnP action: " + action);

    this.getService(this.services, function(err, info) {
        if (err) {
            return callback(err);
        }
        
        self.logger.debug("UPnP controlURL: " + info.controlURL);

        var body =  
            '<?xml version="1.0"?>' +
            '<s:Envelope ' +
            'xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
            's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
            '<s:Body>' + 
            '<u:' + action + ' xmlns:u=' + JSON.stringify(info.service) + '>' + 
            args.map(
                function (args) {
                    return '<' + args[0]+ '>' + (args[1] === undefined ? '' : args[1]) + '</' + args[0] + '>';
            }).join('') +
            '</u:' + action + '>' +
            '</s:Body>' +
            '</s:Envelope>';

        request({
            method: 'POST',
            url: info.controlURL,
            headers: {
                'Content-Type': 'text/xml; charset="utf-8"',
                'Content-Length': Buffer.byteLength(body),
                'Connection': 'close',
                'SOAPAction': JSON.stringify(info.service + '#' + action)
            },
            body: body
        }, 
        function (err, res, body) {
            if (err) {
                return callback(err);
            }

            var parser = new xml2js.Parser();
            parser.parseString(body, function(err, body) {
                if (res.statusCode !== 200) {
                    return callback(Error('upnp request failed: ' + res.statusCode));
                }

                var soapns = nat.utils.getNamespace(body, 'http://schemas.xmlsoap.org/soap/envelope/');
                callback(null, body[soapns + 'Body']);
            });        
        });

    });

};
*/
