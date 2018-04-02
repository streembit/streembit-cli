# Prepare your Raspberry PI for Streembit and the Streembit Zigbee Gateway

This readme explains the installation of Raspberry PI, Node.js and the Streembit Zigbee Gateway.

## Install the Raspberry PI 

Burn the latest Raspbian OS to a micro SD card. 

https://www.raspberrypi.org/documentation/installation/installing-images/

Add an ssh file to the Raspbian boot image at the SD card. Step 3 in this tutorial: https://hackernoon.com/raspberry-pi-headless-install-462ccabd75d0

Login to the Raspberry PI via SSH using your Linux/MAC SSH client or PUTTY on Windows. User name: pi, password: raspberry. Once you logged in via SSH:
```bash
sudo raspi-config
```

1. Enable SSH: select Interfacing Options. Navigate to and select SSH and choose "Yes".

2. Enable serial port: select Interfacing Options. Navigate to Advanced Options/Serial set "No" to “Would you like a login shell to be accessible over serial?” and select "Yes"  to Would you like the serial port hardware to be enabled?" question.
Refer to the "For latest Jessie version" section at https://hallard.me/enable-serial-port-on-raspberry-pi/

## Install the latest Nodejs from source

To take advantage of the latest Node.js framework we suggest you install Node.js from source.

```bash
sudo apt-get update
```

```bash
sudo apt-get install build-essential checkinstall
```

```bash
cd /usr/local/src
```

Download the latest Node.js source. Substitute 9.10.0 with the latest Node.js version number.
```bash
sudo wget https://nodejs.org/dist/v9.10.0/node-v9.10.0.tar.gz
```

```bash
sudo tar -xvzf node-v9.10.0.tar.gz
```

```bash
cd node-v9.10.0
```

```bash
sudo ./configure
```

```bash
sudo make install
```

```bash
node -v
```
The version should be 9.10.0

```bash
sudo npm install -g pm2 
```

## Install Streembit

Install git. 

```bash
sudo apt-get install git
```

Get the latest streembit-cli application.

```bash
git clone https://github.com/streembit/streembit-cli.git
```

```bash
cd streembit-cli
```

```bash
npm install
```

Turn off the Raspberry Pi device. Install the Streembit Zigbee Gateway connect the Raspberry PI device to the power again.

Install the dependencies

```bash
npm install
```

Create a Sreembit configuration file. Refer to the streembit-cli readme at https://github.com/streembit/streembit-cli/blob/develop/README.md

Set the "serialport" field under the IoT module section to /dev/ttyS0. This is the GPIO serial port on Raspberry PI v.3. 

Typical IoT module configuration settings in the config.json configuration file:

 ```json
 {
    ... more settings preceed ... refer to the streembit-cli readme.

    "modules": [
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
        }
    ]

	...more settings follow... refer to the streembit-cli readme.
}
```

Start the streembit application.

```bash
node streembit --pwd=YOUR_PASSWORD
```

The debug logs on the terminal should indicate that the Streeembit application communicates with the Streembit Zigbee Gateway via the serial port.

## Start communicating with Zigbee devices


