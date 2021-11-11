'use strict'

const { expect } = require('chai');
const Bucket = require('../libs/kad/bucket');
const StreembitContact = require('../libs/kad/contacts/streembit-contact');

let contact = {
  host: 'localhost',
  port: 8080,
  publickey: `986ac27d21b009f6ad2660b7586841afc889b145`

};
describe('kad/Bucket', function () {

  const bucket = new Bucket();
  const entries = [
    '0000000000000000000000000000000000000000',
    '0000000000000000000000000000000000000001',
    '0000000000000000000000000000000000000002',
    '0000000000000000000000000000000000000003',
    '0000000000000000000000000000000000000004',
    '0000000000000000000000000000000000000005',
    '0000000000000000000000000000000000000006',
    '0000000000000000000000000000000000000007',
    '0000000000000000000000000000000000000008',
    '0000000000000000000000000000000000000009',
    '0000000000000000000000000000000000000010',
    '0000000000000000000000000000000000000011',
    '0000000000000000000000000000000000000012',
    '0000000000000000000000000000000000000013',
    '0000000000000000000000000000000000000014',
    '0000000000000000000000000000000000000015',
    '0000000000000000000000000000000000000016',
    '0000000000000000000000000000000000000017',
    '0000000000000000000000000000000000000018',
    '0000000000000000000000000000000000000019'
  ];


  describe('addContact', function () {

    it('should add each entry to the head', function () {
      entries.forEach((entry) => bucket.addContact(new StreembitContact({ ...contact, nodeID: entry })));
      [...bucket._contacts].forEach((key, i) => {
        expect(entries.indexOf(key.nodeID)).to.equal(entries.length - (i + 1));
      });
    });
    it('should not add new contacts if bucket is full', function () {
      expect(
        bucket.addContact(new StreembitContact({ ...contact, nodeID: '0000000000000000000000000000000000000020' }))
      ).to.equal(false);
    });

  });

  describe('getSize', function () {
    it('should alias the size property', function () {
      expect(bucket._contacts.length).to.equal(20);
    });
  });


  describe('indexOf', function () {

    it('should return the correct index', function () {
      expect(bucket.indexOf(new StreembitContact({ ...contact, nodeID: entries[6] }))).to.equal(13);
      expect(bucket.indexOf(new StreembitContact({ ...contact, nodeID: entries[4] }))).to.equal(15);
      expect(bucket.indexOf(new StreembitContact({ ...contact, nodeID: entries[19] }))).to.equal(0);
    });

  });

  describe('getContactList', function () {
    it('should return ContactList', function () {
      expect(bucket.getContactList().length).to.equal(entries.length);
    });

  });

  describe('getContact', function () {
    it('should return Contact', function () {
      let contact = bucket.getContact(0) ? bucket.getContact(0).nodeID : null;
      expect(contact).to.equal(entries[entries.length - 1]);
    });

  });

  describe('removeContact', function () {
    it('should remove Contact', function () {
      let ctc = bucket.removeContact(new StreembitContact({ ...contact, nodeID: '0000000000000000000000000000000000000019' }));
      expect(ctc).to.equal(true);
    });

  });


});