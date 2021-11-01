const { Readable: ReadableStream } = require('stream');

const assert = require('chai').assert;
const expect = require('chai').expect;
const logger = require("streembit-util").logger;
const sinon = require('sinon');

const crypto = require('crypto');
const KademliaNode = require('libs/kadence/node-kademlia');
const FakeTransport = require('./fixtures/transport-fake');
const levelup = require('levelup');
const memdown = require('memdown');
const storage = levelup('test:node-kademlia', memdown);
const utils = require('../libs/kadence/utils');
const constants = require('../libs/kadence/constants');


describe("KademilaDHT peer put and get libs/kad/node", function () {
  const keyStringIsValid = function (key) {
    let buf;

    try {
      buf = Buffer.from(key, 'hex');
    } catch (err) {
      return false;
    }

    return keyBufferIsValid(buf);
  };

  const keyBufferIsValid = function (key) {
    return Buffer.isBuffer(key) && key.length === 20;
  };

  before(() => {
    try {
      clock = sinon.useFakeTimers(Date.now(), 'setInterval');
      transport = new FakeTransport();
      kademliaNode = new KademliaNode({
        contact: { name: 'test:node-kademlia:unit' },
        storage,
        transport,
        logger,
        identity: Buffer.from('aa48d3f07a5241291ed0b4cab6483fa8b8fcc128', 'hex')
      });
    } catch (error) {
      console.error(error);
    }


  });

  describe("KademilaDHT: put", function () {


    it('should send store rpc to found contacts and keep copy', function (done) {
      try {
        let sandbox = sinon.createSandbox();
        let contact = { hostname: 'localhost', port: 8080 };
        sandbox.stub(
          kademliaNode,
          'iterativeFindNode'
        ).callsArgWith(
          1,
          null,
          Array(20).fill(null).map(() => [crypto.randomBytes(20).toString('hex'), contact])
        );
        let send = sandbox.stub(kademliaNode, 'send').callsArgWith(3, null);
        send.onCall(4).callsArgWith(3, new Error('Failed to store'));
        let put = sandbox.stub(kademliaNode.storage, 'put').callsArg(3);
        kademliaNode.iterativeStore(
          crypto.randomBytes(20).toString('hex'),
          'some storage item data',
          (err, stored) => {
            sandbox.restore();
            expect(stored).to.equal(19);
            expect(send.callCount).to.equal(20);
            expect(put.callCount).to.equal(1);
            done();
          }
        );
      } catch (error) {
        console.error(error);
      }

    });

    it('should send the store rpc with the existing metadata', function (done) {
      try {
        let contact = { hostname: 'localhost', port: 8080 };
        let sandbox = sinon.createSandbox();
        sandbox.stub(
          kademliaNode,
          'iterativeFindNode'
        ).callsArgWith(
          1,
          null,
          Array(20).fill(null).map(() => [crypto.randomBytes(20).toString('hex'), contact])
        );
        let send = sandbox.stub(kademliaNode, 'send').callsArgWith(3, null);
        send.onCall(4).callsArgWith(3, new Error('Failed to store'));
        let put = sandbox.stub(kademliaNode.storage, 'put').callsArg(3);
        kademliaNode.iterativeStore(
          crypto.randomBytes(20).toString('hex'),
          {
            value: 'some storage item data',
            publisher: 'ea48d3f07a5241291ed0b4cab6483fa8b8fcc127',
            timestamp: Date.now()
          },
          (err, stored) => {
            sandbox.restore();
            expect(send.args[0][1][1].publisher).to.equal(
              'ea48d3f07a5241291ed0b4cab6483fa8b8fcc127'
            );
            expect(stored).to.equal(19);
            expect(send.callCount).to.equal(20);
            expect(put.callCount).to.equal(1);
            done();
          }
        );
      } catch (error) {
        console.error('error===', error);
      }

    });

  });
  describe('Kademila iterativeFindNode', function () {

    it('should send iterative FIND_NODE calls', function (done) {
      try {
        let contact = { hostname: 'localhost', port: 8080 };
        let getClosestContactsToKey = sinon.stub(
          kademliaNode.router,
          'getClosestContactsToKey'
        ).returns([
          ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc127', contact],
          ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc128', contact],
          ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc129', contact]
        ]);
        let _updateContact = sinon.stub(kademliaNode, '_updateContact');
        let send = sinon.stub(kademliaNode, 'send');
        let contacts = Array(20).fill(null).map(() => {
          return [crypto.randomBytes(20).toString('hex'), contact]
        });
        send.onCall(0).callsArgWith(
          3,
          null,
          contacts
        );
        send.onCall(1).callsArgWith(
          3,
          new Error('Lookup failed')
        );
        send.onCall(2).callsArgWith(
          3,
          null,
          contacts
        );
        for (var i = 0; i < 20; i++) {
          send.onCall(i + 3).callsArgWith(
            3,
            new Error('Lookup failed')
          );
        }
        kademliaNode.iterativeFindNode(
          'ea48d3f07a5241291ed0b4cab6483fa8b8fcc126',
          (err, results) => {
            getClosestContactsToKey.restore();
            _updateContact.restore();
            send.restore();
            expect(err).to.equal(null);
            expect(send.callCount).to.equal(23);
            expect(_updateContact.callCount).to.equal(20);
            expect(results).to.have.lengthOf(2);
            results.forEach(([key, c]) => {
              expect(keyStringIsValid(key)).to.equal(true);
              expect(contact).to.equal(c);
            });
            done();
          }
        );
      } catch (error) {
        console.error(error);
      }

    });

    

  });
  // describe('KademilaDHTlisten', function() {

  //   it('should use kad rules and setup refresh/replicate', function(done) {
  //     let sandbox = sinon.createSandbox();
  //     let clock2 = sinon.useFakeTimers(Date.now(), 'setTimeout');
  //     let use = sandbox.stub(kademliaNode, 'use');
  //     let refresh = sandbox.stub(kademliaNode, 'refresh');
  //     let replicate = sandbox.stub(kademliaNode, 'replicate').callsArg(0);
  //     let expire = sandbox.stub(kademliaNode, 'expire');
  //     sandbox.stub(transport, 'listen');
  //     kademliaNode.listen();
  //     clock.tick(constants.T_REPLICATE);
  //     clock2.tick(ms('30m')); // Account for convoy prevention
  //     setImmediate(() => {
  //       sandbox.restore();
  //       clock2.restore();
  //       expect(use.calledWithMatch('PING')).to.equal(true);
  //       expect(use.calledWithMatch('STORE')).to.equal(true);
  //       expect(use.calledWithMatch('FIND_NODE')).to.equal(true);
  //       expect(use.calledWithMatch('FIND_VALUE')).to.equal(true);
  //       expect(refresh.calledWithMatch(0)).to.equal(true);
  //       expect(replicate.callCount).to.equal(1);
  //       expect(expire.callCount).to.equal(1);
  //       done();
  //     });
  //   });

  // });
  describe('KademilaDHT: ping',    function() {
    it('should call send with PING message',  function(done) {
      let send =   sinon.stub(kademliaNode, 'send').callsFake((a, b, c, d) => {
        setTimeout(d, 10);
      });
      let contact = ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc128', {
        hostname: 'localhost',
        port: 8080
      }];
      kademliaNode.ping(contact, (err, latency) => {
        send.restore();
        expect(send.calledWithMatch('PING', [], contact)).to.equal(true);
        expect(latency > 0).to.equal(true);
        done();
      });
      done();
    });

  });
  describe('KademilaDHT: expire', function() {
    it('should expire the correct items', function(done) {
      let sandbox = sinon.createSandbox();
      let items = [
        {
          key: utils.getRandomKeyString(),
          value: {
            value: 'some value',
            timestamp: Date.now() - constants.T_EXPIRE,
            publisher: kademliaNode.identity.toString('hex')
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
        kademliaNode.storage,
        'createReadStream'
      ).returns(new ReadableStream({
        objectMode: true,
        read: function() {
          if (items.length) {
            this.push(items.shift());
          } else {
            this.push(null);
          }
        }
      }));
      let del = sandbox.stub(
        kademliaNode.storage,
        'del'
      ).callsArg(1);
      kademliaNode.expire((err) => {
        sandbox.restore();
        expect(err).to.equal(undefined);
        expect(del.callCount).to.equal(2);
        done();
      });
    });

  });

  describe('KademilaDHT: refresh', function() {

    it('should refresh the correct buckets', function(done) {
      let sandbox = sinon.createSandbox();
      let iterativeFindNode = sandbox.stub(
        kademliaNode,
        'iterativeFindNode'
      ).callsArgWith(1, null, []);
      kademliaNode.router.get(0).set(
        utils.getRandomKeyString(),
        { hostname: 'localhost', port: 8080 }
      );
      kademliaNode.router.get(2).set(
        utils.getRandomKeyString(),
        { hostname: 'localhost', port: 8080 }
      );
      for (var i=0; i<constants.B; i++) {
        kademliaNode._lookups.set(i, Date.now());
      }
      kademliaNode._lookups.set(1, Date.now() - constants.T_REFRESH);
      kademliaNode._lookups.set(2, Date.now() - constants.T_REFRESH);
      kademliaNode.refresh(0, () => {
        sandbox.restore();
        expect(iterativeFindNode.callCount).to.equal(2);
        done();
      });
    });

  });

});