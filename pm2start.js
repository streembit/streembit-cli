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
const pm2 = require("pm2");
const config = require("./config");
=======

const pm2 = require('pm2');
const config = require('./config');
>>>>>>> ef6c4aa2d37e6494eed54843e1e712ef62bf2a4a

let homedir;

try {
<<<<<<< HEAD
  if (config.homedir) {
    homedir = config.homedir; //grab the next item
  }
} catch (err) {
  console.log("argument parse error: %j", err);
}

if (!homedir) {
  //  try to get the current directory
  console.log("setting home dir to current directory");
  homedir = require("path").dirname(__filename);
=======
    if (config.homedir) {
        homedir = config.homedir; //grab the next item
    }
}
catch (err) {
    console.log("argument parse error: %j", err);
}

if (!homedir) {
    //  try to get the current directory
    console.log("setting home dir to current directory");
    homedir = require('path').dirname(__filename);
>>>>>>> ef6c4aa2d37e6494eed54843e1e712ef62bf2a4a
}

console.log("homedir: %s", homedir);

pm2.connect(function (err) {
<<<<<<< HEAD
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const pm2config = {
    name: "streembit",
    script: "streembit.js",
    args: [...process.argv.slice(2), "--pm2"],
    cwd: homedir,
  };

  pm2.start(pm2config, function (err, apps) {
    if (err) {
      return console.log("pm2.start error: %j", err);
    }

    console.log("pm2.start complete");
    process.exit(0);
  });
});
=======
    if (err) {
        console.error(err);
        process.exit(1);
    }

    const pm2config = {
        name    : 'streembit',
        script  : 'streembit.js',
        args    : [ ...process.argv.slice(2), '--pm2' ],
        cwd     : homedir
    };
    
    pm2.start(
        pm2config,
        function (err, apps) {
            if (err) {
                return console.log("pm2.start error: %j", err);
            }
            
            console.log("pm2.start complete");
            process.exit(0);
        }
    );
    
});
>>>>>>> ef6c4aa2d37e6494eed54843e1e712ef62bf2a4a
