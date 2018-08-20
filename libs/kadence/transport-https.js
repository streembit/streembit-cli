'use strict';

const HTTPTransport = require('./transport-http');
const https = require('https');
const merge = require('merge');

/**
 * Extends the HTTP transport with SSL
 */
class HTTPSTransport extends HTTPTransport {

  static get DEFAULTS() {
    return {};
  }

  /**
   * Contructs a new HTTPS transport adapter
   * @constructor
   * @extends {HTTPTransport}
   * @param {object} options
   * @param {buffer} options.key - SSL private key buffer
   * @param {buffer} options.cert - SSL certificate buffer
   * @param {buffer[]} options.ca - List of certificate authority certificates
   */
  constructor(options) {
    super(merge({}, HTTPSTransport.DEFAULTS, options));
  }

  /**
   * Constructs the HTTPS server
   * @private
   */
  _createServer() {
    return https.createServer(...arguments);
  }

  /**
   * Constructs the HTTPS request
   * @private
   */
  _createRequest() {

    const requestOptions = Object.assign(...arguments, {
      key: this._options.key,
      cert: this._options.cert
    });

    requestOptions.protocol = requestOptions.protocol ? requestOptions.protocol+ ':' : null;

    return https.request(requestOptions);
  }

}

module.exports = HTTPSTransport;
