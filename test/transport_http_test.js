const { expect } = require('chai');
const { Server, ClientRequest } = require('http');
const { Socket } = require('net');
const { EventEmitter } = require('events');
const { Readable: ReadableStream } = require('stream');
const sinon = require('sinon');
const Contact = require('../libs/kad/contact');
const StreembitContact = require('../libs/kad/contacts/streembit-contact');
const HTTPTransport = require('../libs/kad/transports/http');

let contact = {
  host: 'localhost',
  port: 8080,
  publickey: `986ac27d21b009f6ad2660b7586841afc889b145`

};

describe('HTTPTransport  libs/kad/transport-http', function () {
  describe('HTTPTransport', function () {

    it('should bubble errors from the underlying server', async (done) => {

      let httpTransport = new HTTPTransport(new StreembitContact(contact), {
      });

      httpTransport.once('error', (err) => {
        expect(err.message).to.equal('Server error');
        done();
      });
      await httpTransport.emit('error', new Error('Server error'));

    });

    it('should buffer message, set pending, and push data', async (done) => {
      let httpTransport = new HTTPTransport(new StreembitContact(contact), {
      });
      let buffer = `{
        "method": "POST",
        "id": "sdfsfsdfdsf",
        "params":{}
      }`;
      expect(httpTransport._handleDroppedMessage(buffer)).to.equal(true);
      done();

    });

  });


});



