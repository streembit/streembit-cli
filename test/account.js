const assert = require('chai').assert;
const expect = require("chai").expect;
const util = require("util");
const createHash = require('create-hash');
const res = require('../resolvedir');
const Account = require('libs/account');
const account_config = require('./account_config.json');
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
            account.accountname = account_config.account;
            let account_name = account.accountname;

            assert.equal(account_name, account_config.account);
        });

        it("Should neither null nor undefined", function () {
            account.accountname = account_config.account;
            let account_name = account.accountname;

            assert.exists(account_name);
        });
    });

    describe("Test ppkikey value", function () {

        it("Should set a value to ppkikey", function () {
            account.ppkikey = account_config.m_key;
            let ppikey_value = account.ppkikey;

            assert.equal(ppikey_value, account_config.m_key);
        });

        it("Should neither null nor undefined", function () {
            account.ppkikey = account_config.m_key;
            let ppikey_value = account.ppkikey;

            assert.exists(ppikey_value);
        })
    });

    describe("Test User Initialization", function () {

        it("Should neither null nor undefined", function () {
            let user = account.is_user_initialized;

            assert.exists(user);
        });

        it("Should be true", function () {
            let user = account.is_user_initialized;

            assert.isOk(user);
        });
    });

    describe("Test password encryption", function () {

        it("Should neither empty nor undefined", function () {
            let pwd_encrypt = account.getCryptPassword(account_config.password);

            assert.exists(pwd_encrypt);
        });

        it("Should be a string", function () {
            let pwd_encrypt = account.getCryptPassword(account_config.password);

            assert.isString(pwd_encrypt);
        });

        it("Should match with the encrypted password", function () {
            let pwd_encrypt = account.getCryptPassword(account_config.password);
            let salt = createHash('sha256').update(account_config.password).digest('hex');
            let pwdhex = createHash('sha256').update(salt).digest('hex');

            assert.equal(pwd_encrypt, pwdhex);
        });
    });
});