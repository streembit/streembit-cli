'use strict';

const { expect } = require('chai');
const { stub } = require('sinon');
const utils = require('../libs/kad/utils');
const Item = require('../libs/kad/Item');

let contact = {
  host: 'localhost',
  port: 8080,
  ts: Date.now(),
  nodeID: '0000000000000000000000000000000000000000',
  publickey: `986ac27d21b009f6ad2660b7586841afc889b145`

};
describe('kad/Item', function () {



  describe('Item', function () {
    let item = new Item(contact.publickey, '', contact.nodeID, contact.ts);

    it('should return currect timestamp', function () {
      expect(item.timestamp).equal(contact.ts);
    });
    it('should return currect key item', function () {
      expect(item.key).equal(contact.publickey);
    });
    it('should return currect publisher', function () {
      expect(item.publisher).equal(contact.nodeID);
    });
  });






});