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

1. Enable SSH: select Interfacing Options. Navigate to and select SSH, and select "Yes".

2. Enable serial port: select Interfacing Options. Navigate to Advanced Options/Serial set "No" to “Would you like a login shell to be accessible over serial?” and select "Yes"  to Would you like the serial port hardware to be enabled?" question.
Refer to the "For latest Jessie version" section at https://hallard.me/enable-serial-port-on-raspberry-pi/

Check the available serial ports and serial port aliases.
```bash
ls -l /dev
```
ttyS0 should be listed in dev directory.

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

Typical IoT module configuration settings in the config.json configuration file. Please note there are section before and after this IoT module config section. 

 ```json
 {
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
}
```

Start the streembit application.

```bash
node streembit --pwd=PASSWORD
```

The debug logs on the terminal should indicate that the Streeembit application communicates with the Streembit Zigbee Gateway via the serial port.

## Add a Streembit user to the Raspberry Pi

To allow command prompt input set the "cmdinput" parameter to "true" tt the streembit-cli configuration file. Start the app by entering

```bash
usr
```
then
```bash
add
```
and follow the prompts. Public key is the only mandatory field and you should fill it with your PKI public key which was copied from the UI.

Once the user is successfully added, stop the cli app. Open config.json and change "cmdinput" to false.

Restart the app with the following command:
```bash
$ node streembit --pwd=PASSWORD --data
```
Copy the value of the BS58 public key of the hub (must be the last string of the output, or close to the last).

Restart the CLI instance in normal mode.
```bash
$ node streembit --pwd=PASSWORD 
```

At the UI you must add this Hub to your IoT Hub list. Click on the "IoT Devices" menu item and click on "Create IoT Hub". Enter the IoT device ID. This is usually the Zigbee MAC of your device that sits top on the streembit-cli Raspberry Pi (such as the Zovolt Zigbee gateway). Enter the device name and copy the BS58 public key of the streembit-cli that you gathered in the previous step. Click on Save and the web application should connect to your streembit-cli IoT instance.

The created IoT Hub should appear on the devices view that is accessible from the "My devices" link.


## Start communicating with Zigbee devices

TODO. 

