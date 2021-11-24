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

import fs from "fs";
import util from "util";
import async from "async";
import * as utils from "./libs/utils/index.js";
import { config } from './libs/config/index.js';
import { constants } from "./libs/constants/index.js";
import { logger, events } from "streembit-util";
import HTTPTransport from "./transport/http/index.js";
import Database from "streembit-db";
import dbschema from "./dbschema.json";
import { Account } from './libs/account/index.js';
import { Tasks } from './libs/tasks/index.js';
import { Users } from './libs/users/index.js';
import { WsServer as WebSocket } from './transport/ws/index.js'
import { ModulesHandler as AppsHandler } from "./apps/index.js"
import WhitelistDB from "./libs/database/whitelistdb.js";
import PubSub from "./libs/pubsub/index.js";

const database = Database.instance;

// initialize the logger
export class App {
  init(port, ip, password, cmd, bcclient) {
    try {
      async.waterfall(
        [
          (callback) => {
            try {
              config.init(port, ip, cmd, bcclient, callback);
            } catch (e) {
              callback(e);
            }
          },
          (callback) => {
            try {
              const loglevel =
                config.log && config.log.level ? config.log.level : "debug";
              if (config.cmdinput || config.bcclient) {
                logger.init(loglevel, null, ["file"]);
              } else {
                logger.init(loglevel);
              }  
              callback();
            } catch (e) {
              callback(e);
            }
          },
          (callback) => {
            if (config.bcclient) {
              return callback();
            }
            try {
              database.init(dbschema, callback);
            } catch (e) {
            }
          },
          (callback) => {
            if (config.bcclient) {
              return callback();
            }
            try {
              const account = new Account();
              account.init(password, callback);
            } catch (e) {
              callback("Account init error: " + e.message);
            }
          },
          (callback) => {
            if (config.bcclient) {
              return callback();
            }
  
            const options = {
              port: config.transport.port,
            };
            const httptransport = new HTTPTransport(options);
            httptransport.init(callback);
          },
          (callback) => {
            if (config.bcclient) {
              return callback();
            }
  
            try {
              const tasks = new Tasks();
              tasks.run(callback);
            } catch (e) {
              callback("Task init error: " + e.message);
            }
          },
          (callback) => {
            if (config.bcclient) {
              return callback();
            }
  
            try {
              const users = new Users();
              users.init(callback);
            } catch (e) {
              callback("Users init error: " + e.message);
            }
          },
          (callback) => {
            let port =
              config.transport && config.transport.ws && config.transport.ws.port
                ? config.transport.ws.port
                : constants.DEFAULT_WS_PORT;
            let maxconn =
              config.transport &&
              config.transport.ws &&
              config.transport.ws.maxconn
                ? config.transport.ws.maxconn
                : constants.DEFAULT_WS_MAXCONN;
            let wsserver = new WebSocket(port, maxconn);
            wsserver.init(callback);
          },
          (callback) => {
            try {
              let apps = new AppsHandler();
              apps.init(callback);
            } catch (e) {
              callback(e);
            }
          },
          (callback) => {
            if (config.bcclient) {
              return callback();
            }
  
            const pubsub = new PubSub();
            pubsub.init(callback);
          },
        ],
        (err) => {
          if (err) {
            return logger.error("application init error: %j", err);
          }
  
          logger.info("The application has been initialized.");

          // app init event
          events.appinit();
        }
      );
    } catch (e) {
      console.log("app error: " + e.message);
    }
  };

  display_data(password) {
    async.waterfall(
      [
        (callback) => {
          config.init_account_params(callback);
        },
        (callback) => {
          database.init(dbschema, callback);
        },
        (callback) => {
          const account = new Account();
          account.load(password, callback);
        },
      ],
      (err, result) => {
        if (err) {
          return console.log(err.message || err);
        }

        const account = new Account();
        //print the node ID
        console.log("accountname: %s", account.accountname);
        console.log("node ID (rmd160hash public key): %s", account.accountpk);
        console.log("publickey hex: %s", account.public_key);
        console.log("publickey encoded hash: %s", account.public_key_hash);
        console.log("publickey bs58pk: %s", account.bs58pk);
      }
    );
  }

  changepwd() {
    console.log("app change password");
  }

  list_users(password) {
    console.log("list users");
    async.waterfall(
      [
        (callback) => {
          config.init_account_params(callback);
        },
        (callback) => {
          database.init(dbschema, callback);
        },
        (callback) => {
          const account = new Account();
          account.load(password, callback);
        },
        (callback) => {
          try {
            const users = new Users();
            users.init(callback);
          } catch (e) {
            callback("Users init error: " + e.message);
          }
        },
      ],
      (err, result) => {
        if (err) {
          return console.log(err.message || err);
        }

        const users = new Users();
        const list = users.list();
        console.log("\nUsers:");
        console.log(util.inspect(list));
      }
    );
  }

  delete_user(password) {
    // get the password from the command prompt
    utils.prompt_for_userid((err, userid) => {
      if (err) {
        return console.log(err.message || err);
      }

      //delete the user id
      async.waterfall(
        [
          (callback) => {
            config.init_account_params(callback);
          },
          (callback) => {
            database.init(dbschema, callback);
          },
          (callback) => {
            const account = new Account();
            account.load(password, callback);
          },
          (callback) => {
            try {
              const users = new Users();
              users.init(callback);
            } catch (e) {
              callback("Users init error: " + e.message);
            }
          },
        ],
        (err, result) => {
          if (err) {
            return console.log(err.message || err);
          }

          console.log("deleting user ID: " + userid);

          const users = new Users();
          users
            .delete_user(userid)
            .then(() => {
              console.log("User was deleted from the database");
            })
            .catch((err) => {
              console.log("Deleting user failed: " + err.message || err);
            });
        }
      );
    });
  }

  backup(password) {
    console.log("app backup account data");

    async.waterfall(
      [
        (callback) => {
          config.init_account_params(callback);
        },
        (callback) => {
          try {
            database.init(dbschema, callback);
          } catch (err) {
            callback(err);
          }
        },
        (callback) => {
          const account = new Account();
          account.load(password, (err) => {
            if (err) {
              return callback(err);
            }

            const data = {
              bs58pk: account.bs58pk,
              pkhex: account.public_key,
              encoded_pkhash: account.public_key_hash,
              private_key: account.private_key_hex,
              nodeid: account.accountpk,
            };

            callback(null, data);
          });
        },
        (data, callback) => {
          try {
            // write to file
            data.timestamp = Date.now();
            const str = JSON.stringify(data, null, 4);
            const wdir = process.cwd();
            const datadir = path.join(wdir, "data");
            const backupfile = path.join(datadir, "account.json");
            fs.writeFile(backupfile, str, (err) => {
              if (err) {
                return callback(err);
              }

              callback();
            });
          } catch (err) {
            callback(err);
          }
        },
      ],
      (err) => {
        if (err) {
          return console.log("Backup error: %j", err.message || err);
        }

        console.log(
          "Backup file account.json was created in the data directory"
        );
      }
    );
  }

  whitelist_update(password, pkey, rm) {
    async.waterfall(
      [
        (callback) => {
          config.init_account_params(callback);
        },
        (callback) => {
          database.init(dbschema, callback);
        },
        (callback) => {
          const account = new Account();
          account.load(password, callback);
        },
        (callback) => {
          const db = new WhitelistDB();
          callback(null, db);
        },
      ],
      (err, wlDb) => {
        if (err) {
          return console.log(err.message || err);
        }

        pkey = pkey.replace(/["']/g, "");

        console.log("updating whitelist: " + pkey);

        if (!rm) {
          wlDb
            .add_rule(pkey, 1)
            .then(() => {
              console.log("Whitelist rule was added");
            })
            .catch((err) => {
              console.log("Error adding whitelist rule: " + err);
            });
        } else {
          wlDb
            .delete_rule(pkey)
            .then(() => {
              console.log("Whitelist rule was deleted");
            })
            .catch((err) => {
              console.log("Error deleting whitelist rule: " + err);
            });
        }
      }
    );
  }

  get_wl(password) {
    async.waterfall(
      [
        (callback) => {
          config.init_account_params(callback);
        },
        (callback) => {
          database.init(dbschema, callback);
        },
        (callback) => {
          const account = new Account();
          account.load(password, callback);
        },
        (callback) => {
          const db = new WhitelistDB();
          callback(null, db);
        },
      ],
      (err, wlDb) => {
        if (err) {
          return console.log(err.message || err);
        }

        wlDb
          .get_rules()
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log("Error adding whitelist rule: " + err);
          });
      }
    );
  }
}
