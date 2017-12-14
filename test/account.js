const assert = require('chai').assert;
const expect = require("chai").expect;
const util = require("util");
const res = require('../resolvedir');
const Account = require('libs/account');
const account_data = require('./account_data.json');
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

    describe("Account name", function () {

        it("Should set a value to m_accountname", function () {
            account.accountname = account_data.name;
            let account_name = account.accountname;

            assert.equal(account_name, account_data.name);
        });

        it("Should neither null nor undefined", function () {
            account.accountname = account_data.name;
            let account_name = account.accountname;

            assert.exists(account_name);
        });
    })
});