const { expect } = require('chai');
const { Server, ClientRequest } = require('http');
const { Socket } = require('net');
const { EventEmitter } = require('events');
const { Readable: ReadableStream } = require('stream');
const sinon = require('sinon');
//const constants = require('../libs/kad/constants');
const HTTPTransport = require('../libs/kadence/transport-http');
const constants = require('../libs/kadence/constants');

describe('HTTPTransport  libs/kad/transport-http', function() {
    describe('HTTPTransport', function() {

        it('should bubble errors from the underlying server', function(done) {
          let httpTransport = new HTTPTransport();
          httpTransport.once('error', (err) => {
            expect(err.message).to.equal('Server error');
            done();
          });
          setImmediate(() =>  httpTransport.server.emit('error', new Error('Server error')));
          done();
        });
    
        it('should call timeout pending requests every interval', function(done) {
          let clock = sinon.useFakeTimers();
          let httpTransport = new HTTPTransport();
          let _timeoutPending = sinon.stub(httpTransport, '_timeoutPending');
          setTimeout(() => {
            clock.restore();
            setImmediate(() => {
              expect(_timeoutPending.called).to.equal(true);
              done();
            });
          }, constants.T_RESPONSETIMEOUT);
          clock.tick(constants.T_RESPONSETIMEOUT);
          done();
        });
    
      });
      describe('HTTPTransport:methods', function() {

        it('should bubble errors the incoming request', function(done) {
          let httpTransport = new HTTPTransport();
          let request = new ReadableStream({ read: () => null });
          request.headers = {};
          let response = new EventEmitter();
          response.end = sinon.stub();
          httpTransport.resume();
          setImmediate(() => {
            httpTransport.server.emit('request', request, response);
            setImmediate(() => {
              request.emit('error', new Error('Request error'));
            });
          });
          httpTransport.on('error', (err) => {
            expect(err.message).to.equal('Request error');
            done();
          });
          done();
        });
    
        it('should bubble errors the outgoing response', function(done) {
          let httpTransport = new HTTPTransport();
          let request = new ReadableStream({ read: () => null });
          request.headers = {};
          let response = new EventEmitter();
          response.end = sinon.stub();
          httpTransport.resume();
          setImmediate(() => {
            httpTransport.server.emit('request', request, response);
            setImmediate(() => {
              response.emit('error', new Error('Response error'));
            });
          });
          httpTransport.on('error', (err) => {
            expect(err.message).to.equal('Response error');
            done();
          });
          done();
        });
    
        it('should send back 400 if no message id header', function(done) {
          let httpTransport = new HTTPTransport();
          let request = new ReadableStream({ read: () => null });
          request.headers = {};
          let response = new EventEmitter();
          response.end = sinon.stub();
          httpTransport.resume();
          setImmediate(() => {
            httpTransport.server.emit('request', request, response);
            setImmediate(() => {
              expect(response.statusCode).to.equal(400);
              expect(response.end.called).to.equal(true);
              done();
            });
          });
          done();
        });
    
        it('should set code to 405 if not post or options', function(done) {
          let httpTransport = new HTTPTransport();
          let request = new ReadableStream({ read: () => null });
          request.headers = {
            'x-kad-message-id': 'message-id'
          };
          request.method = 'GET';
          let response = new EventEmitter();
          response.end = sinon.stub();
          response.setHeader = sinon.stub();
          httpTransport.resume();
          setImmediate(() => {
            httpTransport.server.emit('request', request, response);
            setImmediate(() => {
              expect(response.statusCode).to.equal(405);
              expect(response.end.called).to.equal(true);
              done();
            });
          });
          done();
        });
    
        it('should not process request if not post method', function(done) {
          let httpTransport = new HTTPTransport();
          let request = new ReadableStream({ read: () => null });
          request.headers = {
            'x-kad-message-id': 'message-id'
          };
          request.method = 'OPTIONS';
          let response = new EventEmitter();
          response.end = sinon.stub();
          response.setHeader = sinon.stub();
          httpTransport.resume();
          setImmediate(() => {
            httpTransport.server.emit('request', request, response);
            setImmediate(() => {
              expect(response.end.called).to.equal(true);
              done();
            });
          });
          done();
        });
    
        it('should buffer message, set pending, and push data', function(done) {
          let httpTransport = new HTTPTransport();
          let request = new ReadableStream({ read: () => null });
          request.headers = {
            'x-kad-message-id': 'message-id'
          };
          request.method = 'POST';
          let response = new EventEmitter();
          response.end = sinon.stub();
          response.setHeader = sinon.stub();
          httpTransport.once('data', (buffer) => {
            expect(buffer.toString()).to.equal('test');
            expect(httpTransport._pending.get('message-id').response).to.equal(
              response
            );
            done();
          });
          setImmediate(() => {
            httpTransport.server.emit('request', request, response);
            setImmediate(() => {
              request.push(Buffer.from('test'));
              request.push(null);
            });
          });
          done();
        });
    
      });
  
})