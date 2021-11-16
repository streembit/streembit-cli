'use strict';

const { expect } = require('chai');
const { stub } = require('sinon');
const utils = require('../libs/kad/utils');
const Contact = require('../libs/kad/contact');

let contact = {
  host: 'localhost',
  port: 8080,
  nodeID: '0000000000000000000000000000000000000000',
  publickey: `986ac27d21b009f6ad2660b7586841afc889b145`

};
describe('kad/contact', function () {

  let ctct = new Contact(contact);

  describe('valid', function () {
    it('return true', function () {
      expect(ctct.valid()).equal(true);
    });
  });
  describe('seen', function () {
    it('return true', function () {
      ctct.seen();
      expect(ctct.lastSeen).equal(Date.now());
    });
  });






});