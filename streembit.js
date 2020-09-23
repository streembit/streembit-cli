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

<<<<<<< HEAD
"use strict";

const pinfo = require("./package.json");
const version = pinfo.version;
// resolve the directories for require
const res = require("./resolvedir");
const program = require("commander");
const app = require("app");
=======
'use strict';

const pinfo = require('./package.json');
const version = pinfo.version;
// resolve the directories for require
const res = require('./resolvedir');
const program = require('commander');
const app = require('app');
>>>>>>> ef6c4aa2d37e6494eed54843e1e712ef62bf2a4a
const utils = require("libs/utils");

// show the command prompt when the user type --help
// and get the configuration values from the command prompt
program
<<<<<<< HEAD
  .version(version)
  .option("-pwd, --pwd [pwd]", "Password (secret) to protect the private key")
  .option("-cmd, --cmd", "Initialize command line interface")
  .option("-pm2, --pm2", "PM2 or service/daemon mode")
  .option("-rpcuser, --rpcuser [rpcuser]", "BC client RPC user")
  .option("-rpcpassword, --rpcpassword [rpcpassword]", "BC client RPC password")
  .option("-rpcport, --rpcport [rpcport]", "*optional: BC client RPC port")
  .option("-i, --ip [value]", "IP address for the Streembit seed")
  .option(
    "-p, --port <num>",
    "Port for the Streembit client",
    utils.parse_ipport
  )
  .option("-d, --data", "Print node ID")
  .option("-b, --backup", "Backup node data")
  .option("-c, --changepwd", "Change password")
  .option("-u, --users", "List users")
  .option("-r, --deluser [pkey]", "Delete user")
  .option("-w, --whitelist [pkey]", "Add/Remove a user to/from whitelist")
  .option("-a, --addpk [pkey]", "Add/Remove a user to/from whitelist")
  .parse(process.argv);

try {
  const {
    pwd,
    data,
    backup,
    users,
    whitelist,
    addpk,
    deluser,
    port,
    ip,
    cmd,
    rpcuser,
    rpcpassword,
    rpcport,
    args,
  } = program;

  let bcclient = false;
  if (rpcuser && rpcuser.length && rpcpassword && rpcpassword.length) {
    bcclient = { rpcuser, rpcpassword, rpcport, args };
    if (bcclient.args.length < 1) {
      console.log(
        "\x1b[31m%s\x1b[0m",
        "Error:",
        "Blockchain client does not see a command to execute"
      );
      process.exit(1);
    }
  }

  if (!bcclient && (!pwd || typeof pwd !== "string" || pwd.length < 6)) {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Error:",
      "Password required! Restart the app with --pwd PASSWORD or --pwd=PASSWORD"
    );
    process.exit(1);
  }

  if (data) {
    return app.display_data(pwd);
  }

  if (backup) {
    return app.backup(pwd);
  }

  if (users) {
    return app.list_users(pwd);
  }

  if (whitelist) {
    if (!addpk && !deluser) {
      throw new Error(
        "-w command option requires user private key being provided"
      );
    } else if (
      (addpk && addpk.length < 64) ||
      (deluser && deluser.length < 64)
    ) {
      throw new Error("Invalid public key");
    }

    return app.whitelist_update(pwd, addpk || deluser, !!deluser);
  }

  if (deluser) {
    return app.delete_user(pwd);
  }

  return app(port, ip, pwd, !!cmd, bcclient);
} catch (e) {
  console.log("\x1b[31m%s\x1b[0m", "app command handler error: " + e.message);
=======
    .version(version)
    .option('-pwd, --pwd [pwd]', 'Password (secret) to protect the private key')
    .option('-cmd, --cmd', 'Initialize command line interface')
    .option('-pm2, --pm2', 'PM2 or service/daemon mode')
    .option('-rpcuser, --rpcuser [rpcuser]', 'BC client RPC user')
    .option('-rpcpassword, --rpcpassword [rpcpassword]', 'BC client RPC password')
    .option('-rpcport, --rpcport [rpcport]', '*optional: BC client RPC port')
    .option('-i, --ip [value]', 'IP address for the Streembit seed')
    .option('-p, --port <num>', 'Port for the Streembit client', utils.parse_ipport)
    .option('-d, --data', 'Print node ID')
    .option('-b, --backup', 'Backup node data')
    .option('-c, --changepwd', 'Change password')
    .option('-u, --users', 'List users')
    .option('-r, --deluser [pkey]', 'Delete user')
    .option('-w, --whitelist [pkey]', 'Add/Remove a user to/from whitelist')
    .option('-a, --addpk [pkey]', 'Add/Remove a user to/from whitelist')
    .parse(process.argv);

try {
    const {
        pwd,
        data,
        backup,
        users,
        whitelist,
        addpk,
        deluser,
        port,
        ip,
        cmd,
        rpcuser,
        rpcpassword,
        rpcport,
        args
    } = program;

    let bcclient = false;
    if ((rpcuser && rpcuser.length) && (rpcpassword && rpcpassword.length)) {
        bcclient = { rpcuser, rpcpassword, rpcport, args };
        if (bcclient.args.length < 1) {
            console.log('\x1b[31m%s\x1b[0m', 'Error:', 'Blockchain client does not see a command to execute');
            process.exit(1);
        }
    }

    if (!bcclient && (!pwd || typeof pwd !== 'string' || pwd.length < 6)) {
        console.log('\x1b[31m%s\x1b[0m', 'Error:', 'Password required! Restart the app with --pwd PASSWORD or --pwd=PASSWORD');
        process.exit(1);
    }

    if (data) {
        return app.display_data(pwd);
    }

    if (backup) {
        return app.backup(pwd);
    }

    if (users) {
        return app.list_users(pwd);
    }

    if (whitelist) {
        if (!addpk && !deluser) {
            throw new Error('-w command option requires user private key being provided');
        } else if (addpk && addpk.length < 64 || deluser && deluser.length < 64) {
            throw new Error('Invalid public key');
        }

        return app.whitelist_update(pwd, addpk || deluser, !!deluser);
    }

    if (deluser) {
        return app.delete_user(pwd);
    }

    return app(port, ip, pwd, !!cmd, bcclient);
}
catch (e) {
    console.log('\x1b[31m%s\x1b[0m', 'app command handler error: ' + e.message);
>>>>>>> ef6c4aa2d37e6494eed54843e1e712ef62bf2a4a
}
