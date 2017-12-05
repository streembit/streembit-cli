# streembit-cli
 
 Streembit client project.
 
 TODO describe the project ...
 
 In order to run the application a configuration file config.json must exists in the root directory of the project.
 
 A typical configuration file is the following:
 
 ```json
 {
    "host": "",
    "port": 32321,
    "account": "my_streembit_account",
    "password": "abcdefghjk123456789",
    "seeds": [],
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
            "wsport": 32318,
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

Host: IP address. Keep empty and the app will listen on localhost.

Port: Default is 32321

Account: This is the account name stored in the local SQLITE database. The Streembit UI identifies this node by this account name

Password: To decrypt account information in the SQLITE database. For development purpose and make easy to develop the software define this password in the config file. In production, provide this password from the command line using the --pasword (or -s) command line switch. See "node streembit.js --help" for more command line arguments.

Seeds: List of Streembit Kademlia seed nodes. 

Modules:
This section defines how the application will be executed. Whether it is seed, client, IoT node or a blockchain node. The "run" flag of each module defines whether or not execute the module.
Both "seed" and "client" cannot be defined, it must be either "seed" or "client".

Users: the Streembit UI user who can connect to this node. 

Log: logger settings.



