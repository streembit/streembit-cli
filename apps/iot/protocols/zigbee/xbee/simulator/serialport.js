const GenuineSerialPort = require('serialport/test');
const MockBinding = GenuineSerialPort.Binding;

class SerialPort {
    constructor(port, options, errHandler) {
        // Create a port and enable the echo and recording.
        try {
            MockBinding.createPort(port, Object.create({ echo: true, record: true }, options));
            this.port = new GenuineSerialPort(port);
        } catch (err) {
            errHandler(err);
        }
    }
}

module.exports = SerialPort;
