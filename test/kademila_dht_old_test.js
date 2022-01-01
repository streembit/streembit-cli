import { expect } from "chai";
import { logger } from "streembit-util";
import sinon from "sinon";
import crypto from "crypto";
import { KademliaNode } from "../libs/kadence/node-kademlia.js";
import { FakeTransport } from "./fixtures/transport-fake.js";
import levelup from "levelup";
import memdown from "memdown";
const storage = levelup("test:node-kademlia", memdown);

describe("KademilaDHT peer put and get libs/kad/node", function () {
  const keyStringIsValid = function (key) {
    let buf;

    try {
      buf = Buffer.from(key, "hex");
    } catch (err) {
      return false;
    }

    return keyBufferIsValid(buf);
  };

  const keyBufferIsValid = function (key) {
    return Buffer.isBuffer(key) && key.length === 20;
  };

  let clock = sinon.useFakeTimers(Date.now(), "setInterval");
  let transport = new FakeTransport();
  let kademliaNode = new KademliaNode({
    contact: { name: "test:node-kademlia:unit" },
    storage,
    transport,
    logger,
    identity: Buffer.from("aa48d3f07a5241291ed0b4cab6483fa8b8fcc128", "hex"),
  });

  describe("KademilaDHT: put", function () {
    it("should send store rpc to found contacts and keep copy", function (done) {
      try {
        let sandbox = sinon.createSandbox();
        let contact = { hostname: "localhost", port: 8080 };
        sandbox.stub(kademliaNode, "iterativeFindNode").callsArgWith(
          1,
          null,
          Array(20)
            .fill(null)
            .map(() => [crypto.randomBytes(20).toString("hex"), contact])
        );
        let send = sandbox.stub(kademliaNode, "send").callsArgWith(3, null);
        send.onCall(4).callsArgWith(3, new Error("Failed to store"));
        let put = sandbox.stub(kademliaNode.storage, "put").callsArg(3);
        kademliaNode.iterativeStore(
          crypto.randomBytes(20).toString("hex"),
          "some storage item data",
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

    it("should send the store rpc with the existing metadata", function (done) {
      try {
        let contact = { hostname: "localhost", port: 8080 };
        let sandbox = sinon.createSandbox();
        sandbox.stub(kademliaNode, "iterativeFindNode").callsArgWith(
          1,
          null,
          Array(20)
            .fill(null)
            .map(() => [crypto.randomBytes(20).toString("hex"), contact])
        );
        let send = sandbox.stub(kademliaNode, "send").callsArgWith(3, null);
        send.onCall(4).callsArgWith(3, new Error("Failed to store"));
        let put = sandbox.stub(kademliaNode.storage, "put").callsArg(3);
        kademliaNode.iterativeStore(
          crypto.randomBytes(20).toString("hex"),
          {
            value: "some storage item data",
            publisher: "ea48d3f07a5241291ed0b4cab6483fa8b8fcc127",
            timestamp: Date.now(),
          },
          (err, stored) => {
            sandbox.restore();
            expect(send.args[0][1][1].publisher).to.equal(
              "ea48d3f07a5241291ed0b4cab6483fa8b8fcc127"
            );
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
  });

  describe("Kademila iterativeFindNode", function () {
    it("should send iterative FIND_NODE calls", function (done) {
      try {
        let contact = { hostname: "localhost", port: 8080 };
        let getClosestContactsToKey = sinon
          .stub(kademliaNode.router, "getClosestContactsToKey")
          .returns([
            ["ea48d3f07a5241291ed0b4cab6483fa8b8fcc127", contact],
            ["ea48d3f07a5241291ed0b4cab6483fa8b8fcc128", contact],
            ["ea48d3f07a5241291ed0b4cab6483fa8b8fcc129", contact],
          ]);
        let _updateContact = sinon.stub(kademliaNode, "_updateContact");
        let send = sinon.stub(kademliaNode, "send");
        let contacts = Array(20)
          .fill(null)
          .map(() => {
            return [crypto.randomBytes(20).toString("hex"), contact];
          });
        send.onCall(0).callsArgWith(3, null, contacts);
        send.onCall(1).callsArgWith(3, new Error("Lookup failed"));
        send.onCall(2).callsArgWith(3, null, contacts);
        for (var i = 0; i < 20; i++) {
          send.onCall(i + 3).callsArgWith(3, new Error("Lookup failed"));
        }
        kademliaNode.iterativeFindNode(
          "ea48d3f07a5241291ed0b4cab6483fa8b8fcc126",
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
});
