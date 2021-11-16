'use strict';

const { expect, assert } = require('chai');
const constants = require('../libs/kad/constants');
let hat = require('hat');
const Message = require('../libs/kad/message');

let request = {
  method: 'get',
  params: {
    port: 8080,
    ts: Date.now(),
    nodeID: '0000000000000000000000000000000000000000',
    publickey: `986ac27d21b009f6ad2660b7586841afc889b145`
  }
};
let fakedata = {

};
let response = {
  id: 'id',
  result: {
    port: 8080,
    ts: Date.now(),
    nodeID: '0000000000000000000000000000000000000000',
    publickey: `986ac27d21b009f6ad2660b7586841afc889b145`
  }

};
describe('kad/Message', function () {



  describe('isRequest', function () {
    const message = new Message(request);
    it('isRequest return true', function () {
      expect(message.isRequest(request)).equal(true);
    })
  });

  describe('isResponse', function () {
    const message = new Message(response);
    it('isResponse return true', function () {
      expect(message.isResponse(response)).equal(true);
    })
  });

  describe('isRequest/isResponse error', function () {
    it('isRequest return error', function () {
      try {
        new Message(fakedata);
      } catch (error) {
        assert.isDefined(error, 'Invalid message specification');
      }

    })
  });

  describe('createID', function () {
    const id = hat.rack(constants.B)();
    const message = new Message({ ...request, id: id });
    it('should create id', function () {
      expect(message.id).equal(id);
    })
  });




});