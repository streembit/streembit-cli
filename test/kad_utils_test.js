'use strict';

const { expect } = require('chai');
const { stub } = require('sinon');
const utils = require('../libs/kad/utils');
const constants = require('../libs/kad/constants');


describe('kad/utils', function () {

  describe('@function getRandomKeyString', function () {

    it('should return a random hex string', function () {
      expect(utils.getRandomKeyString()).to.have.lengthOf(40);
      expect(utils.getRandomKeyString()).to.not.equal(
        utils.getRandomKeyString()
      );
    });

  });



  describe('getRandomInBucketRangeBuffer', function () {

    it('should return a B bit random buffer', function () {
      expect(utils.getRandomInBucketRangeBuffer(1)).to.have.lengthOf(constants.B / 8);
      expect(utils.getRandomKeyBuffer()).to.not.equal(
        utils.getRandomKeyBuffer()
      );
    });

  });

  describe('isValidKey', function () {

    it('should return true for valid key string', function () {
      expect(utils.isValidKey(
        '765fa7f8bff0872d512a65beed2c2843a4bc7fb5'
      )).to.equal(true);
    });

    it('should return false for valid key string', function () {
      expect(utils.isValidKey(
        'jf;alksduf-0a9sfdaksjd;lfkajs;lkdfjas9dfdads'
      )).to.equal(false);
    });

    it('should return false for valid key string', function () {
      expect(utils.isValidKey('0')).to.equal(false);
    });

  });

  describe('getDistance', function () {

    it('should return the correct distance buffer', function () {
      let keys = [
        [
          [
            'ceb5136e0bf02772b6917543b4e03629bc23a1d8',
            '63e7a67f3a1841c94a433be9c5071651b1923a0c'
          ],
          'ad52b51131e866bbfcd24eaa71e720780db19bd4'
        ],
        [
          [
            'cc0eb01763bcceda0550cc4407eabf5f42ba1673',
            'a8e14ca6a42c1845112b89f24080f70f0dc6d421'
          ],
          '64effcb1c790d69f147b45b6476a48504f7cc252'
        ],
        [
          [
            '9a736bc23d17a8cee12027693e3c6256248ab58b',
            '679ae587e365aeb05dd11fb97dfa1a94cbfb8afe'
          ],
          'fde98e45de72067ebcf138d043c678c2ef713f75'
        ]
      ];
      keys.forEach(([compare, result]) => {

        expect(utils.getDistance(...compare).toString('hex')).to.equal(result);
      });
    });

  });

  describe('compareKeys', function () {

    let keys = [
      Buffer.from('c8f53a8431f5412e4303acfb9409b61b56001ee1', 'hex'),
      Buffer.from('4c380b21c28a42d1f64b363d03cd0851fa177cca', 'hex')
    ];

    it('should return 1 for sort function', function () {
      expect(utils.compareKeys(...keys)).to.equal(1);
    });

    it('should return -1 for sort function', function () {
      expect(utils.compareKeys(...keys.reverse())).to.equal(-1);
    });

    it('should return 0 for sort function', function () {
      expect(utils.compareKeys(keys[0], keys[0])).to.equal(0);
      expect(utils.compareKeys(keys[1], keys[1])).to.equal(0);
    });

  });




  describe('getRandomInBucketRangeBuffer', function () {

    let testCases = [
      ['54a1d84e56b0380b7878596cd094804154d8079a', 36],
      ['4cde832be44a98364ac81467521b7ae6e25953e3', 54],
      ['2fdd001069eeacad2881f49058c9e368e994ef51', 71],
      ['48b954272a4cae8e72c7fb5ab681fba7661eeeaf', 98],
      ['65663df335e47def178280607980abac6ced8948', 124],
      ['adde001ace4abe9e30b429914a4510f7226ea2da', 142],
      ['0b182a6f7f5a10641ff94473ff83df96a1493e3d', 158]
    ];

    it('should return a reasonably close random key in range', function () {
      testCases.forEach(([key, index], i) => {
        let randomInRange = utils.getRandomInBucketRangeBuffer(i);
        let bucketIndex = utils.getBucketIndex(key, randomInRange.toString('hex'));
        expect(Math.abs(index - bucketIndex) >= 0).to.equal(true);
      });
    });

  });


});