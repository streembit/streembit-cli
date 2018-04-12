## Connecting the FTDI serial converter to the Zovolt Zigbee Gateway

Install the XCTU configuration tool. This pplication must be used to configure the XBEE Zigbee MCU.

The XBEE module of the Zovolt IoT Zigbee Gateway can be programmed with an FTDI USB-to-Serial breakout board. The FTDI board can also connect the Zovolt Zigbee Gateway to the nodejs streembit-cli instance via serial line using the PC/laptop USB connector when the CLI runs on a PC/laptop.

The pin connection between the FTDI board and the Zovolt Zigbee Gateway:

| FTDI			| Gateway-JP1	|
|---------------|---------------|
| DTR (yellow)	| Pin 1 		|
| RXI (blue)	| Pin 4 		|
| TXO (green)	| Pin 3 		|
| 3V3 (red)		| Pin 6 		|
| CTS (geeen)	| Pin 2			|
| GND (black)	| Pin 5			|


The pictures display the FTDI and gateway wires. 

FTDI board wires:

![FTDI wires](ftdi_to_gateway_pins.png?raw=true "FTDI wires")

Gateway JP1 wires:

![Gateway JP1](gateway_to_ftdi_pins.png?raw=true "Gateway JP1")


