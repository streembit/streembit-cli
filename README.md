# streembit-cli
 
 Streembit back-end application.
 
 This application is the Streembit back-end process. Depending on the configuration settings the application can run as
 - A Streembit Kademlia node
 - A Streembit client application
 - A Streembit IoT application 
 - A Streembit blockchain application
 
 **Dependencies**
 
 Get the dependencies with 
```bash
$ npm install
```

Windows note:
In case of leveldown or any any node-gyp error provide a correct msvs_version build parameter e.g.
```bash
npm install leveldown --msvs_version=2015
```

In order to run the application a configuration file config.json must exists in the root directory of the project.
 
A typical configuration file is the following:
 
 ```json
 {
    "database_name": "streembitsql",
	"cmdinput": false,
    "seeds": [],
    "transport": {
        "protocol": "http",
        "host": "182.120.242.165",
        "port": 32321,
        "ws": {
            "port": 32318,
	    "maxconn":  10000
        }
    },
    "limits": {
        "refresh": 3600,
        "replicate": 3600,
        "republish": 86400,
        "expire": 86405,
        "timeout": 5
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
            "contacts": []
        },
        {
            "name": "blockchain",
            "run": false
        },
        {
            "name": "iot",
            "run": false,
            "serialport": "/dev/ttyS0",
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
        },
	{
            "name": "dns",
            "run": true,
            "host": "srv.streembit.net",
            "port": 8080
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

The "database_name" field: This is the SQLITE database name. Default value is "streembitsql". You may change it for production or for testing purpose. For using different databases in production or testing.

When the "cmdinput" field is true the application can recieve commands via the terminal. Also, when the "cmdinput" field is true the terminal logs are disabled and only file based log is enabled.

The "transport" field:

protocol: default value is "http".

host: IP address or domain name for the HTTP listener. <br />
For seed node: Since The Kademlia contact is the composite of IP address and port, if the application run as a Kademlia seed node this field is required and must be an IP address. 

port: Port for the http listener. Default value is 32321

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

The "Limits" section of the configuration determines time interval values of various KAD operations.<br />
"Limits" intervals (values are in seconds):

refresh: Interval for performing router refresh, Default value is 3600

replicate: Interval for replicating local data, Default value is 3600

republish: Interval for republishing data, Default value is 86400

expire: Interval for expiring local data entries, Default value is 86405

timeout: Time to wait for RPC response, Default value is 5

Modules:
This section defines how the application will be executed. Whether it is seed, client, IoT node or a blockchain node. The "run" flag of each module defines whether or not execute the module.
Both "seed" and "client" cannot be defined, it must be either "seed" or "client".

The role of the DNS module is to manage dynamic DNS updates for the domain name based host field. The DNS module defines the parameters of a dynamic DNS service. This module is used in case if you define a domain name at the transport.host field and network router uses DHCP. Using DHCP the DNS A record of the doomain name (host) must be updated upon the start of this CLI application. By default the application uses srv.streembit.net:8080. Most CLI will define a static IP address at the host field. **In case if an IP address is defined at the transport.host field then you must remove the DNS module from the configuration file.**

Log: logger settings.

**Create a Kademlia network for test and development**

When do you need to execute this step and experiment with the Kademlia network? 
- If you want to understand better how the Streembit Kademlia network works
- If you want to develop the UI and connect to a local Kademlia network

Do you need this for Streembit IoT module and to run the Streembit IoT module on a Raspberry PI? **No.** If you want to run the Streembit IoT handler please skip this section and move to the "Streembit IOT Handler" section.

For test and development purposes to create a basic Kademlia network at least two nodes must exist on the network. To run multiple nodes on a computer, do the the following steps:

1) In step 1 we need to create a streembit-cli application, this will be seed No. 1, the first seed node of the Kademlia network.
The "port" of the config.json file can be default port 32321. The "host" field of the config.json file must be defined. For development purposes it should be your local IP like 192.168.xxx.xxx or even just 127.0.0.1. 
The "account" field can be anything, such as "seed1".
The "seeds" field of the config is an empty array. 
Run the application, with
```bash
$ node streembit --pwd PASSWORD
OR
$ node streembit --pwd=PASSWORD 
```
In a case you start a pm2 instance of the app you should also provide a valid password

The console and the log files should display a warning log "there are no seeds defined, the node is not connected to any seeds" which indicates there are no seeds defined.

2) In step 2, clone streembit-cli to an other directory (or copy the existing one). This will be the second seed of the Kademlia network. Set the port to 32322. Since this is a TCP listening port it must be different than the port of seed 1 node. 
Define the seeds array in the config file. The seed is the instance that is described at point No. 1. The seed config settings:
```json
{
 "seeds": [
  {
      "id": "b925f073406a991a38361672660fc4ccae88d457",
      "host": "192.168.0.10",
      "port": 32321
  }
 ]
}
```
The host is your machine's local IP so it might different than 192.168.0.10.
The "id" field of the seed must be the Rmd160 hash of the seed's public key.
Run the application with 
```bash
$ node streembit --pwd PASSWORD
```

At this point seed No. 2 will try to connect to seed No. 1. 
Upon successful connection you should see debug messages on the console as well as in the log files of seed No. 1. These are debug messages related to FIND_NODE Kademlia operations.
"debug: received FIND_NODE from {'publickey': '...' } 
The public key of the message is the public key of seed No. 2 that is logged to the console and log file during startup.
The FIND_NODE messages indicates that the Kademlia network is formed.

Once the Kademlia network is operational the Streembit UI application can connect to the network.

## Command line interface

Set the "cmdinput" field to true in the config.json configuration file to intiate the command line handler. The command line handler accepts commands from the terminal. In "cmdinput" mode once the application is initialized there is a command prompt displayed: "Enter command type:"

**Add user**

Enter the "usr" command type at the command prompt.

```bash
$ usr
```

The "Enter users command:" prompt will appear. Enter "add" to the command prompt.

```bash
$ add
```

Answer the prompt by typing the user name, public key, whether or not the user is an admin (1 or 0 value). The public key is the long PKI public key format that you can get from the Public key column of the "Account/network info" view, accessbile from the "Tools" menu at the Streembit UI application.


## Streembit IOT Handler

To manage your IoT devices on Streembit a few additional configuration steps are required to be done.

**Step 1**

Since we are using encrypted connections which appear as WSS and HTTPS, the corresponding configuration is required in the config.json file.

Generate or obtain SSL certificates for your domain and include the certificate files in the ssl folder.

** Required files **

 - CA: ssl/DOMAIN.ca-bundle.crt
 - Certificate: ssl/DOMAIN.crt
 - Key: ssl/DOMAIN.key

**Step 2**

Make sure you modify your config.json according to this example

```json
{
   "database_name": "streembitsql",
   "cmdinput": true,
   "seeds": [
	{
            "host": "seed.streembit.uk",
            "port": 32319
        }
   ],
   "transport": {
       "protocol": "http",
       "host": "domain name OR ip address OR empty string ",
       "port": 32319,
	   "ws": {
           "port": 32320
       },
	"ssl": true,
	"ca": "ssl/aaaaz.streembit.org.ca-bundle.crt",
        "cert": "ssl/aaaaz.streembit.org.crt",
        "key": "ssl/aaaaz.streembit.org.key"
   },
   "limits": {
       "refresh": 3600,
       "replicate": 3600,
       "republish": 86400,
       "expire": 86405,
       "timeout": 5
   },
   "modules": [
       {
           "name": "seed",
           "run": false
       },
       {
           "name": "client",
           "run": true
       },
       {
           "name": "blockchain",
           "run": false
       },
       {
           "name": "iot",
           "run": true,
           "serialport": "/dev/ttyS0",
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
       },
       {
            "name": "dns",
            "run": true,
            "host": "srv.streembit.net",
            "port": 8080
        }
   ],
   "log": {
       "level": "debug",
       "logs_dir": "logs"
   }
}
```

For IoT node: the transport.host field can be the following:
- IP address - type the valid public static IP adddress of your device. The Streembit UI will try to connect to the IoT node via this static public IP address.
- Domain name - type a domain name which DNS services is configured. The Streembit UI will connect to the IoT node via this domain name.
- "" - empty string. By configuring the device with this option and define an empty string i.e "", the application will try to resolve the external (public) IP address of the device. The Streembit UI will connect to the IoT node via this resolved public IP address.

Notice that we are using domain names instead of IP addresses for the ssl cert configuration. This is important. Also there must be at least one valid seed, as well as run value in client and iot modules set to 'true'.

**Step 3**

To allow connection to this IoT CLI instance, a user must be defined and saved in the CLI local database.

In order to do this, open your Streembit UI, open "Tools" > "Account/network info" and copy the public key value.

At the CLI to allow command prompt input set the "cmdinput" parameter to "true". Start the app by entering
```bash
$ node streembit --pwd=PASSWORD
```
enter
```bash
usr
```
then
```bash
add
```
and follow the prompts. Public key is the only mandatory field and you should fill it with your PKI public key which was copied from the UI.

**Step 4**

Once the user is successfully added, stop the cli app. Open config.json and change "cmdinput" to false.

Restart the app with the following command:
```bash
$ node streembit --pwd=PASSWORD --data
```
Copy the value of the BS58 public key of the hub (must be the last string of the output, or close to the last).

At the UI you must add this Hub to your IoT Hub list. Click on the "IoT Devices" menu item and click on "Create IoT Hub". Enter the IoT device ID. This is usually the Zigbee MAC of your device that sits top on the streembit-cli Raspberry Pi (such as the Zovolt Zigbee gateway). Enter the device name and copy the BS58 public key of the streembit-cli that you gathered in the previous step. Click on Save and the web application should connect to your streembit-cli IoT instance.

The created IoT Hub should appear on the devices view that is accessible from the "My devices" link.

**Step 5**

Configuring Raspberry PI to run as IoT using streembit-cli repo.

Once you have Raspbian OS installed and running on your device, create a new user (say, uiot) and clone the repo into arbitrary folder under this user namespace. eg, /home/uiot/sreembit-cli

Follow all the aforementioned steps

Now we need to make the app automatically start on system boot up. To acheive this first start app with PM2 

```bash
$ node pm2start --pwd=YOUR_PASSWORD
```
a quick side note: since pm2 was not installed globally but rather as a node dependency the path executable would be ./node_modules/pm2/bin/pm2

after the app successfully executed (make sure of it by looking at pm2 logs) first stop it by using 
```bash
./node_module/pm2/bin/pm2 delete all
```
then do
```bash
sudo env PATH=$PATH:/home/uiot/streembit-cli/node_modules/pm2/bin pm2 startup -u uiot --hp /home/uiot/
```

next, execute
```bash
/home/uiot/streembit-cli/node_modules/pm2/bin pm2 save
```

replace uiot with a username of your choice and check for the correctness of the path

Now, it is time to reboot OS and check if the app was autostarted by pm2 daemon
you can do it with
```bash
/home/uiot/streembit-cli/node_modules/pm2/bin pm2 list
```
