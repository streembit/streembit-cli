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
Author: Tibor Zsolt Pardi 
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

var StreembitContact = require('../contacts/streembit-contact');
var Message = require('../message');
var assert = require('assert');
var inherits = require('util').inherits;
var http = require('http');
var https = require('https');
var RPC = require('../rpc');

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

/**
 * Opens the HTTP server and handles incoming messages
 * @private
 * @param {Function} done
 */
HTTPTransport.prototype._open = function(done) {
  var self = this;

  function createServer(handler) {
    return self._sslopts ?
           self._protocol.createServer(self._sslopts, handler) :
           self._protocol.createServer(handler);
  }

  this.peer_processor = function(payload, req, res) {
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

          var retval = false;

          var message = JSON.parse(payload);
          if (!message || !message.type) {
              return false;
          }

          switch (message.type) {
              case "DISCOVERY":
                  var ipaddress = req.connection.remoteAddress;
                  var reply = JSON.stringify({ address: ipaddress });
                  res.end(reply);
                  retval = true;
                  break;

              case "PUT":
              case "GET":
              case "TXN":
              case "PING":
                  this.peer_msg_receive(message, complete);
                  retval = true;
                  break;

              default:
                  // bad request
                  res.statusCode = 405;
                  res.end();
                  retval = true;
          }
      }
      catch (err) {
          self._log.error('HTTP peer_processor error: %s', err.message);
          res.end();
          return true;
      }

      return retval;
  }

  this._server = createServer(function(req, res) {
    var payload = '';
    var message = null;

    if (self._cors) {
        self._addCrossOriginHeaders(req, res);
    }

    if (req.method === 'OPTIONS') {
        return res.end();
    }

    if (req.method !== 'POST') {
        res.statusCode = 400;
        return res.end();
    }

    req.on('error', function(err) {
        self._log.warn('remote client terminated early: %s', err.message);
        self.receive(null);
    });

    req.on('data', function(chunk) {
        payload += chunk.toString();
    });

    //request end
    req.on('end', function () {

        var processed = self.peer_processor(payload, req, res);
        if (processed) {
            return;
        }

        var buffer = new Buffer(payload);

        try {
            message = Message.fromBuffer(buffer);
        }
        catch (err) {
            return self.receive(null);
        }

        if (Message.isRequest(message) && message.id) {
            var pending = {
                timestamp: Date.now(),
                response: res
            };
            self._pendingmsgs.set(message.id, pending);
        }

        self.receive(buffer, {});
    });

  });

  // we should disable nagling as all of our response gets sent in one go:
  this._server.on('connection', function(socket) {
    // disable the tcp nagle algorithm on the newly accepted socket:
    socket.setNoDelay(true);
  });

  this._server.listen(this._contact.port, done);
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
  this._server.close();
};

/**
 * Adds CORS headers to the given response object
 * @private
 * @param {http.IncomingMessage} res
 */
HTTPTransport.prototype._addCrossOriginHeaders = function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
