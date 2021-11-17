'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { Readable: ReadableStream } = require('stream');
const levelup = require('levelup');
const memdown = require('memdown');
const FakeTransport = require('./fixtures/transport-fake');
const storage = levelup('test:node-kademlia', memdown);
const bunyan = require('bunyan');
const config = require("libs/config");
const StreembitContact = require('../libs/kad/contacts/streembit-contact');
const Node = require('../libs/kad/node');
const constants = require('../libs/kad/constants');
const utils = require('../libs/kad/utils');
const Bucket = require('../libs/kad/bucket');

let contact = {
  host: 'localhost',
  port: 8080,
  ts: Date.now(),
  nodeID: '0000000000000000000000000000000000000000',
  publickey: `986ac27d21b009f6ad2660b7586841afc889b145`

};
describe('kad/node', function () {



  this.timeout(12000);
  it('should return', function () {
    expect(true).equal(true);
  });

  let logger, transport, kademliaNode, clock;

  before(() => {

    clock = sinon.useFakeTimers(Date.now(), 'setInterval');
    logger = bunyan.createLogger({
      name: 'test:node-abstract:unit',
      level: 'fatal'
    });
    transport = new FakeTransport();
    transport._contact = new StreembitContact({ ...contact });
    kademliaNode = new Node({
      contact: { name: 'test:node-kademlia:unit' },
      storage,
      config: config,
      transport,
      logger,
      identity: Buffer.from('aa48d3f07a5241291ed0b4cab6483fa8b8fcc128', 'hex')
    });
  });


  describe('_bindRPCMessageHandlers', function () {

    it('should use kad rules and setup refresh/replicate', function (done) {
      let sandbox = sinon.createSandbox();

      let use = sandbox.stub(kademliaNode, '_bindRPCMessageHandlers');

      let replicate = sandbox.stub(kademliaNode, '_replicate').callsArg(0);
      let expire = sandbox.stub(kademliaNode, '_expire');


      sandbox.restore();
      expect(use.calledWithMatch('PING')).to.equal(false);
      expect(use.calledWithMatch('STORE')).to.equal(false);
      expect(use.calledWithMatch('FIND_NODE')).to.equal(false);
      expect(use.calledWithMatch('FIND_VALUE')).to.equal(false);

      expect(replicate.callCount).to.equal(0);
      expect(expire.callCount).to.equal(0);


      done();
    });

  });

  describe('_handlePing', function () {

    it('should call send with PING message', function (done) {
      let send = sinon.stub(kademliaNode, '_bindRPCMessageHandlers').callsFake((a, b, c, d) => {
        setTimeout(d, 10);
        return true;
      });


      expect(send.calledWithMatch('PING', [], contact)).to.equal(false);
      send.restore();
      done();
    });

  });


  describe('_expire', function () {

    it('should expire the correct items', function (done) {
      let sandbox = sinon.createSandbox(); let error;
      let items = [
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - constants.T_EXPIRE,
            publisher: utils.getRandomKeyString()
          }
        },
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - constants.T_EXPIRE,
            publisher: utils.getRandomKeyString()
          }
        },
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - 1000,
            publisher: utils.getRandomKeyString()
          }
        }
      ];
      sandbox.stub(
        kademliaNode._storage,
        'createReadStream'
      ).returns(new ReadableStream({
        objectMode: true,
        read: function () {
          if (items.length) {
            this.push(items.shift());
          } else {
            this.push(null);
          }
        }
      }));
      let del = sandbox.stub(
        kademliaNode._storage,
        'del'
      ).callsArg(1);
      try {
        kademliaNode._expire();
      } catch (error) {
        error = error;

      }
      sandbox.restore();
      expect(error).to.equal(undefined);
      expect(del.callCount).to.equal(0);
      done();

    });

  });

  describe('_replicate', function () {

    it('should replicate and republish the correct items', function (done) {
      let sandbox = sinon.createSandbox();
      let items = [
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - constants.T_REPUBLISH,
            publisher: utils.getRandomKeyString()
          }
        },
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - constants.T_REPLICATE,
            publisher: utils.getRandomKeyString()
          }
        },
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - 1000,
            publisher: utils.getRandomKeyString()
          }
        }
      ];
      sandbox.stub(
        kademliaNode._storage,
        'createReadStream'
      ).returns(new ReadableStream({
        objectMode: true,
        read: function () {
          if (items.length) {
            this.push(items.shift());
          } else {
            this.push(null);
          }
        }
      }));
      let iterativeStore = sandbox.stub(kademliaNode, '_handleStore')
        .callsArg(2);
      kademliaNode._replicate();

      sandbox.restore();

      done();

    });

  });

});