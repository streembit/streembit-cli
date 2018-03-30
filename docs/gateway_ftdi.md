## Connecting the FTDI serial converter to the Zovolt Zigbee gateway

The XBEE module of the Zovolt Iot Zigbee gateway can be programmed with an FTDI USB-to_serial breakout board. The FTDI bord can also connect the gateway to the nodejs streembit-cli instance via the PC/laptop via serial line using the PC/laptop USB connector.

The pin connection between the FTDI board and the gateway:

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


