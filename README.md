# streembit-cli
 
 Streembit client project.
 
 TODO describe the project ...
 
 In order to run the application a configuration file config.json must exists in the root directory of the project.
 
 A typical configuration file is the following:
 
 ```json
 {
    "account": "my_streembit_account",
    "password": "abcdefghjk123456789",
    "seeds": [],
    "transport": {
        "protocol": "http",
        "host": "192.168.0.10",
        "port": 32321,
        "ws": {
            "port": 32318
        }
    },
    "modules": [
        {
            "name": "seed",
            "run": true
        },
        {
            "name": "client",
            "run": false,
            "account": "",
            "wshandler": {},
            "is_private": false,
            "storage": {},
            "contacts": []
        },
        {
            "name": "blockchain",
            "run": false
        },
        {
            "name": "iot",
            "run": false,
            "serialport": "Com3",
            "protocols": [
                {
                    "name": "zigbee",
                    "chipset": "xbee"
                },
                {
                    "name": "zwave"
                },
                {
                    "name": "6lowpan"
                }
            ],
            "devices": [
                {
                    "type": 1,
                    "protocol": "zigbee",
                    "mcu": "xbee",
                    "id": "0013a20041679c00",
                    "name": "Streembit Hub",
                    "permission": 1,
                    "details": {
                        "manufacturername": "ZoVolt",
                        "modelidentifier": "ZOVOLT-P2PIOTHUB-01",
                        "hwversion": "0001",
                        "protocol": "Zigbee",
                        "security": "ECC PPKI",
                        "NFC": true,
                        "endpoint": 2
                    }
                }
            ]
        }
    ],
    "users": [
        {
            "pkhash": "my_streembit_ui_publickey_hash",
            "publickey": "my_streembitui_long_publickey",
            "username": "",
            "isadmin": true,
            "settings": {}
        }
    ],
    "log": {
        "level": "debug",
        "logs_dir": "logs"
    }
}
```

**Fields:**

Account: This is the account name stored in the local SQLITE database. The Streembit UI identifies this node by this account name

Password: To decrypt account information in the SQLITE database. For development purpose and make easy to develop the software define this password in the config file. In production, provide this password from the command line using the --pasword (or -s) command line switch. See "node streembit.js --help" for more command line arguments.

The "transport" field:

protocol: default value is "http".

host: IP address. If the application run as a Kademlia node this field is required and must be an IP address.

port: Default is 32321

ws.port: Port for the websocket listener. Default value is 32318.

Seeds: Array of Streembit Kademlia seed nodes.

The format is
```json
[
    {
        "host": "192.168.0.10",
        "port": 32322
    }
]
```
The host and port where the seed node listen for connections.

Modules:
This section defines how the application will be executed. Whether it is seed, client, IoT node or a blockchain node. The "run" flag of each module defines whether or not execute the module.
Both "seed" and "client" cannot be defined, it must be either "seed" or "client".

Users: the Streembit UI user who can connect to this node. 

Log: logger settings.

**Create a Kademlia network**

For test and development purposes to create a basic Kademlia network at least two nodes must exist on the network. To run multiple nodes on a computer, do the the following steps:

1) In step 1 we need to create a streembit-cli application, this will be seed No. 1, the first seed node of the Kademlia network.
The "port" of the config.json file can be default port 32321. The "host" field of the config.json file must be defined. For development purposes it should be your local IP like 192.168.xxx.xxx or even just 127.0..0.1. 
The "account" field can be anything, such as "seed1".
The "seeds" field of the config is an empty array. 
Run the application, with
```bash
$ node streembit
```
The console and the log files should display a warning log "there are no seeds defined, the node is not connected to any seeds" which indicates there are no seeds defined.

2) In step 2, clone streembit-cli to an other directory (or copy the existing one). This will be the second seed of the Kademlia network. Set the port to 32322. Since this is a TCP listening port it must be different than the port of seed 1 node. 
Define the seeds array in the config file. The seed is the instance that is described at point No. 1. The seed config settings:
```json
{
 "seeds": [
  {
      "host": "192.168.0.10",
      "port": 32321
  }
 ]
}
```
(The host is your machine's local IP so it might different than 192.168.0.10.)
Set the "account" field, it can be anything, but should be different than seed No. 1, like "seed2".
Run the application with 
```bash
$ node streembit
```

At this point seed No. 2 will try to connect to seed No. 1. 
Upon successful connection you should see debug messages on the console as well as in the log files of seed No. 1. These are debug messages related to FIND_NODE Kademlia operations.
"debug: received FIND_NODE from {'publickey': '...' } 
The public key of the message is the public key of seed No. 2 that is logged to the console and log file during startup.
The FIND_NODE messages indicates that the Kademlia network is formed.

Once the Kademlia network is operational the Streembit UI application can connect to the network.
