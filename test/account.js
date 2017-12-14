const assert = require('chai').assert;
const expect = require("chai").expect;
const util = require("util");
const res = require('../resolvedir');
const Account = require('libs/account');
//const peerutils = require("libs/peernet/peerutils");
//const stutils = require("libs/utils");
//const constants = require("libs/constants");

describe("Account module test lib/account", function () {
    var account;

    before(function () {
        account = new Account();
    });

    describe("Test Constructor initialization", function () {
        it("should set the m_key to null", function () {
            assert.equal(account.m_key, null);
        });
        it("should set the m_connsymmkey to null", function () {
            assert.equal(account.m_connsymmkey, null);
        });
        it("should set the m_accountname to null", function () {
            assert.equal(account.m_accountname, null);
        });
    });
});