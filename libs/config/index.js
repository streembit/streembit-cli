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

"use strict";

import assert from "assert";
import config from "../../config.json";
import { Command } from "commander";
import { constants } from "../constants/index.js";
import { exec } from "child_process";

const program = new Command();

/*const streembit_config = ((cnfobj) => {
  let m_cmdinput = null;
  let m_seed_config = null;
  let m_client_config = null;
  let m_iot_config = null;
  let m_blockchain_config = null;
  let m_password = null;
  let m_port = null;
  let m_ipaddress = null;
  let m_log = null;
  let m_seeds = null;
  let m_usertype = null;
  let m_account_name = null;
  let m_database_name = null;
  let m_users = null;
  let m_wsmode = null;

  Object.defineProperty(cnfobj, "password", {
    get: () => {
      return m_password;
    },

    set: (value) => {
      m_password = value;
    },
  });

  Object.defineProperty(cnfobj, "host", {
    get: () => {
      return m_ipaddress;
    },

    set: (value) => {
      m_ipaddress = value;
    },
  });

  Object.defineProperty(cnfobj, "cmdinput", {
    get: () => {
      return m_cmdinput;
    },

    set: (value) => {
      m_cmdinput = value;
    },
  });

  Object.defineProperty(cnfobj, "seed_config", {
    get: () => {
      return m_seed_config;
    },

    set: (value) => {
      m_seed_config = value;
    },
  });

  Object.defineProperty(cnfobj, "client_config", {
    get: () => {
      return m_client_config;
    },

    set: (value) => {
      m_client_config = value;
    },
  });

  Object.defineProperty(cnfobj, "iot_config", {
    get: () => {
      return m_iot_config;
    },

    set: (value) => {
      m_iot_config = value;
    },
  });

  Object.defineProperty(cnfobj, "blockchain_config", {
    get: () => {
      return m_blockchain_config;
    },

    set: (value) => {
      m_blockchain_config = value;
    },
  });

  Object.defineProperty(cnfobj, "wsmode", {
    get: () => {
      return m_wsmode;
    },

    set: (value) => {
      m_wsmode = value;
    },
  });

  Object.defineProperty(cnfobj, "port", {
    get: () => {
      return m_port;
    },

    set: (value) => {
      m_port = value;
    },
  });

  Object.defineProperty(cnfobj, "log", {
    get: () => {
      return m_log;
    },

    set: (value) => {
      m_log = value;
    },
  });

  Object.defineProperty(cnfobj, "seeds", {
    get: () => {
      return m_seeds;
    },

    set: (value) => {
      m_seeds = value;
    },
  });

  Object.defineProperty(cnfobj, "usertype", {
    get: () => {
      return m_usertype;
    },

    set: (value) => {
      m_usertype = value;
    },
  });

  Object.defineProperty(cnfobj, "account", {
    get: () => {
      return m_account_name;
    },

    set: (value) => {
      m_account_name = value;
    },
  });

  Object.defineProperty(cnfobj, "database_name", {
    get: () => {
      return m_database_name;
    },

    set: (value) => {
      m_database_name = value;
    },
  });

  Object.defineProperty(cnfobj, "users", {
    get: () => {
      return m_users;
    },

    set: (value) => {
      m_users = value;
    },
  });

  cnfobj.transport = {
    identity: "",
    protocol: "",
    host: "",
    localip: 0,
    port: 0,
    ws: {
      port: 0,
    },
  };

  cnfobj.limits = {
    refresh: 0,
    replicate: 0,
    republish: 0,
    expire: 0,
    timeout: 0,
  };

  cnfobj.init = (argv_port, argv_ip, cmd, bcclient, callback) => {
    try {
      cnfobj.log = config.log;

      // set the ssl flag
      cnfobj.transport.ssl = config.transport.ssl;
      cnfobj.transport.cert = config.transport.cert;
      cnfobj.transport.key = config.transport.key;
      cnfobj.transport.ca = config.transport.ca;

      let ipport = argv_port ? argv_port : 0;
      if (!ipport) {
        //  check the config file
        ipport = config.transport.port || constants.DEFAULT_STREEMBIT_PORT;
      }
      assert(ipport > 0 && ipport < 65535, "Invalid port configuration value");
      cnfobj.transport.port = ipport;

      let ip = argv_ip;
      if (!ip) {
        //  check the config file
        ip = config.transport.host || 0;
      }
      cnfobj.transport.host = ip;

      // set the ws port
      cnfobj.transport.ws.port =
        config.transport.ws.port || constants.DEFAULT_WS_PORT;

      // set the Kademlia port
      cnfobj.transport.kad = {};
      cnfobj.transport.kad.port =
        config.transport.kad && config.transport.kad.port
          ? config.transport.kad.port
          : constants.DEFAULT_KAD_PORT;
      cnfobj.transport.kad.host =
        config.transport.kad && config.transport.kad.host
          ? config.transport.kad.host
          : "";

      // set the ws max connection
      cnfobj.transport.ws.maxconn =
        config.transport.ws.maxconn || constants.DEFAULT_WS_MAXCONN;

      cnfobj.cmdinput = (config.cmdinput || cmd) && !program.pm2;

      // give a preference to cmdinput
      // if cmdinput is true then ditch bcclient
      // and start cmd handler
      cnfobj.bcclient = cnfobj.cmdinput ? false : bcclient;

      cnfobj.seeds = config.seeds;

      cnfobj.usertype = config.usertype || constants.USERTYPE_HUMAN;

      if (!config.database_name) {
        return callback(
          "database_name is missing from the configuration file."
        );
      }
      cnfobj.database_name = config.database_name;

      cnfobj.limits = {};

      // time limits set for kad tools
      // the defult values like 3600 are in seconds so needs to get the milliseconds here
      cnfobj.limits.refresh =
        config.limits && config.limits.refresh && config.limits.refresh >= 3600
          ? config.limits.refresh * 1000
          : 3600 * 1000;
      cnfobj.limits.replicate =
        config.limits &&
          config.limits.replicate &&
          config.limits.replicate >= 3600
          ? config.limits.replicate * 1000
          : 3600 * 1000;
      cnfobj.limits.republish =
        config.limits &&
          config.limits.republish &&
          config.limits.republish >= 43200
          ? config.limits.republish * 1000
          : 86400 * 1000;
      cnfobj.limits.expire =
        config.limits && config.limits.expire && config.limits.expire >= 43201
          ? config.limits.expire * 1000
          : 86405 * 1000;
      cnfobj.limits.timeout =
        config.limits && config.limits.timeout && config.limits.timeout >= 4
          ? config.limits.timeout * 1000
          : 5 * 1000;

      // Validate the configuration file. There are some configurations disallowed. Throw an exception here if we detect such invalid configuration
      let seedcfarr = config.modules.filter((item) => {
        return item.name == "seed";
      });
      let seedconf = seedcfarr && seedcfarr.length ? seedcfarr[0] : 0;
      cnfobj.seed_config = seedconf;
      if (!cnfobj.seed_config) {
        cnfobj.seed_config = {};
      }
      // bcclient mode disables seed module,
      // overriding config
      cnfobj.seed_config.run = cnfobj.bcclient
        ? false
        : cnfobj.seed_config.run || false;

      let iot_confarr = config.modules.filter((item) => {
        return item.name == "iot";
      });
      let iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
      cnfobj.iot_config = iotconf;
      if (!cnfobj.iot_config) {
        cnfobj.iot_config = {};
      }
      if (!cnfobj.iot_config.hasOwnProperty("run")) {
        cnfobj.iot_config.run = false;
      }

      if (cnfobj.seed_config.run && cnfobj.iot_config.run) {
        throw new Error(
          "Invalid configuration. IoT handler cannot run when the seed is configured to run"
        );
      }

      let clientcfarr = config.modules.filter((item) => {
        return item.name == "client";
      });
      let clientconf = clientcfarr && clientcfarr.length ? clientcfarr[0] : 0;
      cnfobj.client_config = clientconf;
      if (!cnfobj.client_config) {
        cnfobj.client_config = {};
      }
      if (!cnfobj.client_config.hasOwnProperty("run")) {
        cnfobj.client_config.run = false;
      }
      if (cnfobj.seed_config.run && cnfobj.client_config.run) {
        throw new Error(
          "Invalid configuration. Client handler cannot run when the seed is configured to run"
        );
      }

      const blockchain_confarr = config.modules.filter((item) => {
        return item.name == "blockchain";
      });
      let bcconf =
        blockchain_confarr && blockchain_confarr.length
          ? blockchain_confarr[0]
          : 0;
      cnfobj.blockchain_config = bcconf;
      if (!cnfobj.blockchain_config) {
        cnfobj.blockchain_config = {};
      }
      if (!cnfobj.blockchain_config.hasOwnProperty("run")) {
        cnfobj.blockchain_config.run = false;
      }

      if (cnfobj.blockchain_config.run && cnfobj.bcclient) {
        throw new Error(
          "Invalid configuration. App cannot run in seed and IoT mode, or in blockchain server and blockchain client mode simultaneously"
        );
      }

      // set the wsmode, it could be either none, srvc (service mode) or iot (IoT mode)
      let wsm = constants.WSMODE_NONE;
      if (seedconf && seedconf.run) {
        wsm = constants.WSMODE_SRVC;
      } else if (bcconf && bcconf.run) {
        wsm = constants.WSMODE_SRVC;
      } else if (iotconf && iotconf.run) {
        wsm = constants.WSMODE_IOT;
      }

      cnfobj.wsmode = wsm;

      // get the dns handler settings
      const dnsconf = config.modules.filter((item) => {
        return item.name == "dns";
      });
      if (dnsconf && dnsconf.length) {
        if (!dnsconf[0].host || !dnsconf[0].port) {
          throw new Error(
            "Invalid DNS configuration. Host and port are required"
          );
        }
        cnfobj.dns = dnsconf[0];
      } else {
        cnfobj.dns = { run: false };
      }

      if (cnfobj.client_config.run) {
        try {
          exec(
            "ifconfig | grep -Eo 'inet (addr:)?([0-9]*\\.){3}[0-9]*' | grep -Eo '([0-9]*\\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1 | tr -d '\n'",
            (err, ip4) => {
              if (err !== null) {
                console.error(
                  `exec ifconfig error:  ${err.message ? err.message : err}`
                );
                cnfobj.transport.localip = 0;
              } else {
                cnfobj.transport.localip = ip4;
              }
              return callback();
            }
          );
        } catch (e) {
          // still let run the module if the ifconfig failed for any reasons
          console.error(`exec ifconfig error:  ${e.message}`);
          cnfobj.transport.localip = 0;
        }
      } else {
        return callback();
      }
    } catch (err) {
      callback(err.message);
    }
  };

  cnfobj.init_account_params = (callback) => {
    try {
      const iot_confarr = config.modules.filter((item) => {
        return item.name == "iot";
      });
      const iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
      cnfobj.iot_config = iotconf;

      if (!config.database_name) {
        return callback(
          "database_name is missing from the configuration file."
        );
      }
      cnfobj.database_name = config.database_name;

      return callback();
    } catch (err) {
      callback(err.message);
    }
  };

  return cnfobj;
})({});

export { streembit_config as config };*/


class StreembitConfig {
  constructor() {
    this.m_cmdinput = null;
    this.m_seed_config = null;
    this.m_client_config = null;
    this.m_iot_config = null;
    this.m_blockchain_config = null;
    this.m_password = null;
    this.m_port = null;
    this.m_ipaddress = null;
    this.m_log = null;
    this.m_seeds = null;
    this.m_usertype = null;
    this.m_account_name = null;
    this.m_database_name = null;
    this.m_users = null;
    this.m_wsmode = null;
    this.cnfobj = {
      transport: {
        identity: "",
        protocol: "",
        host: "",
        localip: 0,
        port: 0,
        ws: {
          port: 0,
        },
      },
      limits: {
        refresh: 0,
        replicate: 0,
        republish: 0,
        expire: 0,
        timeout: 0,
      }
    };
  }

  get password() {
    return this.m_password;
  }

  set password(value) {
    this.m_password = value;
  }


  get host() {
    return this.m_ipaddress;
  }

  set host(value) {
    this.m_ipaddress = value;
  }


  get cmdinput() {
    return this.m_cmdinput;
  }

  set cmdinput(value) {
    this.m_cmdinput = value;
  }

  get seed_config() {
    return this.m_seed_config;
  }

  set seed_config(value) {
    this.m_seed_config = value;
  }


  get client_config() {
    return this.m_client_config;
  }

  set client_config(value) {
    this.m_client_config = value;
  }


  get iot_config() {
    return this.m_iot_config;
  }

  set iot_config(value) {
    this.m_iot_config = value;
  }

  get blockchain_config() {
    return this.m_blockchain_config;
  }

  set blockchain_config(value) {
    this.m_blockchain_config = value;
  }

  get wsmode() {
    return this.m_wsmode;
  }

  set wsmode(value) {
    this.m_wsmode = value;
  }


  get port() {
    return this.m_port;
  }

  set port(value) {
    this.m_port = value;
  }


  get log() {
    return this.m_log;
  }

  set log(value) {
    this.m_log = value;
  }

  get seeds() {
    return this.m_seeds;
  }

  set seeds(value) {
    this.m_seeds = value;
  }

  get seeds() {
    return this.m_seeds;
  }

  set seeds(value) {
    this.m_seeds = value;
  }

  get usertype() {
    return this.m_usertype;
  }

  set usertype(value) {
    this.m_usertype = value;
  }


  get account() {
    return this.m_account_name;
  }

  set account(value) {
    this.m_account_name = value;
  }

  get database_name() {
    return this.m_database_name;
  }

  set database_name(value) {
    this.m_database_name = value;
  }
  get users() {
    return this.m_users;
  }

  set users(value) {
    this.m_users = value;
  }

  init(argv_port, argv_ip, cmd, bcclient) {
    try {
      this.cnfobj.log = config.log;

      // set the ssl flag
      this.cnfobj.transport.ssl = config.transport.ssl;
      this.cnfobj.transport.cert = config.transport.cert;
      this.cnfobj.transport.key = config.transport.key;
      this.cnfobj.transport.ca = config.transport.ca;

      let ipport = argv_port ? argv_port : 0;
      if (!ipport) {
        //  check the config file
        ipport = config.transport.port || constants.DEFAULT_STREEMBIT_PORT;
      }
      assert(ipport > 0 && ipport < 65535, "Invalid port configuration value");
      this.cnfobj.transport.port = ipport;

      let ip = argv_ip;
      if (!ip) {
        //  check the config file
        ip = config.transport.host || 0;
      }
      this.cnfobj.transport.host = ip;

      // set the ws port
      this.cnfobj.transport.ws.port =
        config.transport.ws.port || constants.DEFAULT_WS_PORT;

      // set the Kademlia port
      this.cnfobj.transport.kad = {};
      this.cnfobj.transport.kad.port =
        config.transport.kad && config.transport.kad.port
          ? config.transport.kad.port
          : constants.DEFAULT_KAD_PORT;
      this.cnfobj.transport.kad.host =
        config.transport.kad && config.transport.kad.host
          ? config.transport.kad.host
          : "";

      // set the ws max connection
      this.cnfobj.transport.ws.maxconn =
        config.transport.ws.maxconn || constants.DEFAULT_WS_MAXCONN;

      this.cnfobj.cmdinput = (config.cmdinput || cmd) && !program.pm2;

      // give a preference to cmdinput
      // if cmdinput is true then ditch bcclient
      // and start cmd handler
      this.cnfobj.bcclient = this.cnfobj.cmdinput ? false : bcclient;

      this.cnfobj.seeds = config.seeds;

      this.cnfobj.usertype = config.usertype || constants.USERTYPE_HUMAN;

      if (!config.database_name) {
        throw new Error('database_name is missing from the configuration file.');
      }
      this.cnfobj.database_name = config.database_name;

      this.cnfobj.limits = {};

      // time limits set for kad tools
      // the defult values like 3600 are in seconds so needs to get the milliseconds here
      this.cnfobj.limits.refresh =
        config.limits && config.limits.refresh && config.limits.refresh >= 3600
          ? config.limits.refresh * 1000
          : 3600 * 1000;
      this.cnfobj.limits.replicate =
        config.limits &&
          config.limits.replicate &&
          config.limits.replicate >= 3600
          ? config.limits.replicate * 1000
          : 3600 * 1000;
      this.cnfobj.limits.republish =
        config.limits &&
          config.limits.republish &&
          config.limits.republish >= 43200
          ? config.limits.republish * 1000
          : 86400 * 1000;
      this.cnfobj.limits.expire =
        config.limits && config.limits.expire && config.limits.expire >= 43201
          ? config.limits.expire * 1000
          : 86405 * 1000;
      this.cnfobj.limits.timeout =
        config.limits && config.limits.timeout && config.limits.timeout >= 4
          ? config.limits.timeout * 1000
          : 5 * 1000;

      // Validate the configuration file. There are some configurations disallowed. Throw an exception here if we detect such invalid configuration
      let seedcfarr = config.modules.filter((item) => {
        return item.name == "seed";
      });
      let seedconf = seedcfarr && seedcfarr.length ? seedcfarr[0] : 0;
      this.cnfobj.seed_config = seedconf;
      if (!this.cnfobj.seed_config) {
        this.cnfobj.seed_config = {};
      }
      // bcclient mode disables seed module,
      // overriding config
      this.cnfobj.seed_config.run = this.cnfobj.bcclient
        ? false
        : this.cnfobj.seed_config.run || false;

      let iot_confarr = config.modules.filter((item) => {
        return item.name == "iot";
      });
      let iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
      this.cnfobj.iot_config = iotconf;
      if (!this.cnfobj.iot_config) {
        this.cnfobj.iot_config = {};
      }
      if (!this.cnfobj.iot_config.hasOwnProperty("run")) {
        this.cnfobj.iot_config.run = false;
      }

      if (this.cnfobj.seed_config.run && this.cnfobj.iot_config.run) {
        throw new Error(
          "Invalid configuration. IoT handler cannot run when the seed is configured to run"
        );
      }

      let clientcfarr = config.modules.filter((item) => {
        return item.name == "client";
      });
      let clientconf = clientcfarr && clientcfarr.length ? clientcfarr[0] : 0;
      this.cnfobj.client_config = clientconf;
      if (!this.cnfobj.client_config) {
        this.cnfobj.client_config = {};
      }
      if (!this.cnfobj.client_config.hasOwnProperty("run")) {
        this.cnfobj.client_config.run = false;
      }
      if (this.cnfobj.seed_config.run && this.cnfobj.client_config.run) {
        throw new Error(
          "Invalid configuration. Client handler cannot run when the seed is configured to run"
        );
      }

      const blockchain_confarr = config.modules.filter((item) => {
        return item.name == "blockchain";
      });
      let bcconf =
        blockchain_confarr && blockchain_confarr.length
          ? blockchain_confarr[0]
          : 0;
      this.cnfobj.blockchain_config = bcconf;
      if (!this.cnfobj.blockchain_config) {
        this.cnfobj.blockchain_config = {};
      }
      if (!this.cnfobj.blockchain_config.hasOwnProperty("run")) {
        this.cnfobj.blockchain_config.run = false;
      }

      if (this.cnfobj.blockchain_config.run && this.cnfobj.bcclient) {
        throw new Error(
          "Invalid configuration. App cannot run in seed and IoT mode, or in blockchain server and blockchain client mode simultaneously"
        );
      }

      // set the wsmode, it could be either none, srvc (service mode) or iot (IoT mode)
      let wsm = constants.WSMODE_NONE;
      if (seedconf && seedconf.run) {
        wsm = constants.WSMODE_SRVC;
      } else if (bcconf && bcconf.run) {
        wsm = constants.WSMODE_SRVC;
      } else if (iotconf && iotconf.run) {
        wsm = constants.WSMODE_IOT;
      }

      this.cnfobj.wsmode = wsm;

      // get the dns handler settings
      const dnsconf = config.modules.filter((item) => {
        return item.name == "dns";
      });
      if (dnsconf && dnsconf.length) {
        if (!dnsconf[0].host || !dnsconf[0].port) {
          throw new Error(
            "Invalid DNS configuration. Host and port are required"
          );
        }
        this.cnfobj.dns = dnsconf[0];
      } else {
        this.cnfobj.dns = { run: false };
      }

      if (this.cnfobj.client_config.run) {
        try {
          exec(
            "ifconfig | grep -Eo 'inet (addr:)?([0-9]*\\.){3}[0-9]*' | grep -Eo '([0-9]*\\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1 | tr -d '\n'",
            (err, ip4) => {
              if (err !== null) {
                console.error(
                  `exec ifconfig error:  ${err.message ? err.message : err}`
                );
                this.cnfobj.transport.localip = 0;
              } else {
                this.cnfobj.transport.localip = ip4;
              }
              return true;
            }
          );
        } catch (e) {
          // still let run the module if the ifconfig failed for any reasons
          console.error(`exec ifconfig error:  ${e.message}`);
          this.cnfobj.transport.localip = 0;
        }
      } else {
        return true;
      }
    } catch (err) {
      throw new Error(err.message);
    }
  };

  init_account_params() {
    try {
      const iot_confarr = config.modules.filter((item) => {
        return item.name == "iot";
      });
      const iotconf = iot_confarr && iot_confarr.length ? iot_confarr[0] : 0;
      this.cnfobj.iot_config = iotconf;

      if (!config.database_name) {
        throw new Error('database_name is missing from the configuration file.');

      }
      this.cnfobj.database_name = config.database_name;

      return true;
    } catch (err) {
      throw new Error(err.message);

    }
  };

}

const _StreembitConfig = new StreembitConfig();
export { _StreembitConfig as config };


