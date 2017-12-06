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
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------
  
*/


/**
 * Implementation is based on https://github.com/kadtools/kad 
 * Huge thanks to Gordon Hall https://github.com/gordonwritescode the author of kad library!
 * @module kad
 * @license GPL-3.0
 * @author Gordon Hall gordon@gordonwritescode.com
 */


'use strict';

const StreembitContact = require('../contacts/streembit-contact');
const Message = require('../message');
const assert = require('assert');
const inherits = require('util').inherits;
const http = require('http');
const https = require('https');
const RPC = require('../rpc');
const events = require("streembit-util").events;
const util = require('util');

// create agents to enable http persistent connections:
var httpagent = new http.Agent({keepAlive: true, keepAliveMsecs: 25000});
var httpsagent = new https.Agent({keepAlive: true, keepAliveMsecs: 25000});

/**
 * Transport adapter that sends and receives messages over HTTP
 * @constructor
 * @extends {RPC}
 * @param {StreembitContact} contact - Your node's {@link Contact} instance
 * @param {Object} options
 * @param {Boolean} options.cors - Allow cross origin resource sharing
 * @param {Object} options.ssl - Options to pass to https.createServer()
 */
function HTTPTransport(contact, options) {
  if (!(this instanceof HTTPTransport)) {
    return new HTTPTransport(contact, options);
  }

  this._cors = options && !!options.cors;
  this._sslopts = options && options.ssl;
  this._protocol = this._sslopts ? https : http;
  // assign the correct agent based on the protocol:
  this._agent = this._sslopts ? httpsagent : httpagent;

  this._pendingmsgs = new Map();

  this.peer_msg_receive = options.peermsgrcv;

  assert(contact instanceof StreembitContact, 'Invalid contact supplied');
  RPC.call(this, contact, options);
  this.on('MESSAGE_DROP', this._handleDroppedMessage.bind(this));
}

inherits(HTTPTransport, RPC);

HTTPTransport.prototype._open = function (done) {
    var self = this;

    this.requesthandler = function (payload, req, res) {
        try {

            function create_error_buffer(err) {
                var errmsg = JSON.stringify({ error: err.message ? err.message : err });
                var buffer = new Buffer(errmsg);
                return buffer;
            }

            function complete(err, data) {
                if (err) {
                    res.statusCode = 500;
                    var buffer = create_error_buffer(err);
                    return res.end(buffer);
                }

                // make sure it is a buffer
                if (data && typeof data != "string") {
                    data = JSON.stringify(data);
                }

                res.end(data);
            }

            var message = JSON.parse(payload);
            if (!message || !message.type) {
                try {
                    var buffer = new Buffer(payload);
                    message = Message.fromBuffer(buffer);

                    if (Message.isRequest(message) && message.id) {
                        var pending = {
                            timestamp: Date.now(),
                            response: res
                        };
                        self._pendingmsgs.set(message.id, pending);
                    }

                    self.receive(buffer, {});
                }
                catch (err) {
                    this._log.error('HTTP requesthandler message error: ' + err.message);
                    return self.receive(null);
                }
            }
            else {
                switch (message.type) {
                    case "PUT":
                    case "GET":
                    case "PING":
                        this.peer_msg_receive(message, complete);
                        break;

                    default:
                        // bad request
                        res.statusCode = 405;
                        res.end();
                        break;
                }
            }
        }
        catch (err) {
            self._log.error('HTTP requesthandler error: %s', err.message);
            res.end();
        }
    }

    self._log.info('HTTP_open events.register events.ONPEERMSG');

    events.register(
        events.ONPEERMSG,
        (payload, req, res) => {
            //console.log("ONPEERMSG");
            //console.log(util.inspect(payload));
            self.requesthandler(payload, req, res);
        }
    );

    done();
};


/**
 * Sends a RPC to the given contact
 * @private
 * @param {Buffer} data
 * @param {Contact} contact
 */
HTTPTransport.prototype._send = function(data, contact) {
  var self = this;
  var parsed = JSON.parse(data.toString());

  function handleResponse(res) {
    var payload = '';

    res.on('data', function(chunk) {
        payload += chunk.toString();
    });

    res.on('error', function(err) {
        self._log.error("HTTP handleResponse error: ", err.message);
        self.receive(null);
    });

    res.on('end', function () {
        if (!payload || payload.length == 0) {
            self._log.debug('HTTP response handler INVALID payload received.');
            return self.receive(null);
        }

        self.receive(new Buffer(payload), {});
    });
  }

  if (this._pendingmsgs.has(parsed.id)) {
      this._pendingmsgs.get(parsed.id).response.end(data);
      this._pendingmsgs.delete(parsed.id);
      return;
  }

  if (!contact.valid()) {
    this._log.warn('Refusing to send message to invalid contact');
    return this.receive(null);
  }

  var req = self._protocol.request(
      {
        hostname: contact.host,
        port: contact.port,
        method: 'POST',
        agent: self._agent
      },
      handleResponse
  );

  req.setNoDelay(true); // disable the tcp nagle algorithm

  req.on('error', function (err) {
    self.receive(null);
  });

  req.end(data);
};

/**
 * Close the underlying socket
 * @private
 */
HTTPTransport.prototype._close = function() {
};


/**
 * Listen for dropped messages and make sure we clean up references
 * @private
 */
HTTPTransport.prototype._handleDroppedMessage = function(buffer) {
  var message;

  try {
    message = Message.fromBuffer(buffer);
  }
  catch (err) {
    return false;
  }

  if (this._pendingmsgs[message.id]) {
    this._pendingmsgs.get(message.id).response.end();
    this._pendingmsgs.delete(message.id);
  }

  return true;
};

module.exports = HTTPTransport;
