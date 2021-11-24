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
-------------------------------------------------------------------------------------------------------------------------

*/

"use strict";

import async from "async";
import { logger, events } from "streembit-util";
import { constants } from "../../libs/constants/index.js";
import { config } from "../../libs/config/index.js";
import PeerClient from "../../libs/peernet/peerclient.js";
import * as libutils from "../../libs/utils/index.js";

// import { natupnp } from "../../libs/upnp/index.js";

const peerclient = new PeerClient();
const interval = 600000; // 10 mins

const upnpProc = (callback) => {
  try {
    const upnpclient = natupnp.createClient(logger);
    const wsport =
      config.transport && config.transport.ws && config.transport.ws.port
        ? config.transport.ws.port
        : constants.DEFAULT_WS_PORT;
    const httpport = config.transport.port;
    async.waterfall(
      [
        (next) => {
          upnpclient.portMapping(
            {
              public: wsport,
              private: wsport,
              ttl: 0,
            },
            (err) => next(err)
          );
        },
        (next) => {
          upnpclient.portMapping(
            {
              public: httpport,
              private: httpport,
              ttl: 0,
            },
            (err) => next(err)
          );
        },
        (next) => {
          upnpclient.externalIp(next);
        },
      ],
      (err, ip) => {
        if (err) {
          logger.error(`UPnP procedure error: ${err.message}`);
        } else {
          logger.info(`UPnP set, public IP: ${ip}`);
        }

        callback();
      }
    );
  } catch (e) {
    logger.error(`UPnP procedure error: ${e.message}`);
    callback();
  }
};

/*
    Use this method to work out the host. It is either a domain name or the external IP address.
    If the host is defined then use that data. If the host is empty then get the external IP address by pinging a seed.
*/
const resolveHost = (callback, initUpdater = null) => {
  try {
    if (initUpdater && config.transport && config.transport.host) {
      // validate the host is correct in the config, either it is a valid domain and IP address
      if (
        !libutils.is_ipaddress(config.transport.host) &&
        !libutils.is_valid_domain(config.transport.host)
      ) {
        return callback(
          "Invalid host configuration value. When the host is defined it must be either a valid domain name or IP adddress"
        );
      } else {
        return callback();
      }
    }

    peerclient.ping((err, response) => {
      if (err) {
        return callback(`Resolving IP address failed, error: ${err}`);
      }
      if (!response) {
        return callback(
          "Resolving IP address failed, error: invalid response returned"
        );
      }

      let data = JSON.parse(response);

      if (!data || !data.clientip || !libutils.is_ipaddress(data.clientip)) {
        return callback(
          "Resolving IP address failed, error: invalid external IP address returned from a seed"
        );
      }

      // the IP is returned, set the host to the IP value
      config.transport.host = data.clientip;

      callback();

      if (initUpdater) {
        setInterval(() => {
          resolveHost((err) => {
            if (err) {
              logger.error(err);
            }
          });
        }, interval);
      }
    });
  } catch (e) {
    callback(`Resolving host IP address error: ${e.message}`);
  }
};

export default (callback) => {
  try {
    config.net = constants.CLIENTNET;

    const conf = config.client_config;
    if (!conf.run) {
      logger.info("Config client handler -> not running");
      return callback();
    }

    logger.info("Run streembit client handler");

    resolveHost((err) => {
      if (err) {
        return callback(err);
      }

      upnpProc(() => {
        logger.info("Client handler started");
        callback();

        // process the tasks following init
        events.taskinit(constants.TASK_INFORM_CONTACTS, { all: true });
      });
    }, 1);
  } catch (err) {
    console.log("err: ------------- ", err);
    callback(err.message);
  }
};
