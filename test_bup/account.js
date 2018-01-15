const assert = require('chai').assert;
const expect = require("chai").expect;
const util = require("util");
const createHash = require('create-hash');
const res = require('../resolvedir');
const Account = require('libs/account');
const ecckey = require('libs/crypto');
const config = require("libs/config");
const dbschema = require("dbschematest");
const database = require("streembit-db").instance;
const Database = require("libs/database/accountdb");
const account_config = require('./account_config.json');
//const peerutils = require("libs/peernet/peerutils");
//const stutils = require("libs/utils");
//const constants = require("libs/constants");

describe("Account module test lib/account", function () {
    var account;

    before(function (done) {
        account = new Account();
        config.init(account_config.port, account_config.host, account_config.password, function () {
            database.init(dbschema, function () {

                done();
            });
        });
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

        it("should set a value to m_accountname", function () {
            account.accountname = account_config.account;
            let account_name = account.accountname;

            assert.equal(account_name, account_config.account);
        });

        it("should neither null nor undefined", function () {
            let account_name = account.accountname;

            assert.exists(account_name);
        });

        it("should match with the account object's m_accountname", function () {
            let account_name = account.accountname;

            assert.equal(account_name, account.m_accountname);
        });
    });

    describe("Test ppkikey() value", function () {

        it("should set a value to ppkikey", function () {
            let ppkikey_value = new ecckey();
            let m_publickey = account_config.publickey;
            ppkikey_value.keyFromPrivate(m_publickey, 'hex');
            account.ppkikey = ppkikey_value;

            assert.isDefined(account.ppkikey);
        });

        it("should neither null nor undefined", function () {
            let ppkikey_value = account.ppkikey;

            assert.exists(ppkikey_value);
        });

        it("should not be an empty string", function () {
            let ppkikey_value = account.ppkikey;

            assert.notEqual(ppkikey_value, '');
        });

        it("Should be an object", function () {
            let ppkikey_value = account.ppkikey;

            assert.isObject(ppkikey_value);
        });
    });

    describe("Test cryptokey()", function () {

        it("should be defined", function () {
            let crypto_key = account.cryptokey;

            assert.isDefined(crypto_key);
        });

        it("should neither null or undefined", function () {
            let crypto_key = account.cryptokey;

            assert.exists(crypto_key);
        });

        it("should be truthy", function () {
            let crypto_key = account.cryptokey;

            assert.isOk(crypto_key);
        });

        it("should not be an empty string", function () {
            let crypto_key = account.cryptokey;

            assert.notEqual(crypto_key, '');
        });

        it("should be an object", function () {
            let crypto_key = account.cryptokey;

            assert.isObject(crypto_key);
        });
    });

    describe("Test private_key()", function () {

        it("should be defined", function () {
            let private_key = account.private_key;

            assert.isDefined(private_key);
        });

        it("should neither null nor undefined", function () {
            let private_key = account.private_key;

            assert.exists(private_key);
        });

        it("should be truthy", function () {
            let private_key = account.private_key;

            assert.isOk(private_key);
        });

        it("should not be an empty string", function () {
            let private_key = account.private_key;

            assert.notEqual(private_key, '');
        });

        it("should be an object", function () {
            let private_key = account.private_key;

            assert.isObject(private_key);
        });
    });

    describe("Test private_key_hex()", function () {

        it("should be defined", function () {
            let private_key_hex = account.private_key_hex;

            assert.isDefined(private_key_hex);
        });

        it("should neither null or undefined", function () {
            let private_key_hex = account.private_key_hex;

            assert.exists(private_key_hex);
        });

        it("should be truthy", function () {
            let private_key_hex = account.private_key_hex;

            assert.isOk(private_key_hex);
        });

        it("should be a string", function () {
            let private_key_hex = account.private_key_hex;

            assert.isString(private_key_hex);
        });

        it("should not be an empty string", function () {
            let private_key_hex = account.private_key_hex;

            assert.notEqual(private_key_hex, '');
        });
    });

    describe("Test public_key()", function () {

        it("should be defined", function () {
            let public_key = account.public_key;

            assert.isDefined(public_key);
        });

        it("should neither null nor undefined", function () {
            let public_key = account.public_key;

            assert.exists(public_key);
        });

        it("should be truthy", function () {
            let public_key = account.public_key;

            assert.isOk(public_key);
        });

        it("should be a string", function () {
            let public_key = account.public_key;

            assert.isString(public_key);
        });

        it("should not be an empty string", function () {
            let public_key = account.public_key;

            assert.notEqual(public_key, '');
        });
    });

    describe("Test bs58pk()", function () {

        it("should be defined", function () {
            let bs58pk_key = account.bs58pk;

            assert.isDefined(bs58pk_key);
        });

        it("should neither null nor undefined", function () {
            let bs58pk_key = account.bs58pk;

            assert.exists(bs58pk_key);
        });

        it("should be truthy", function () {
            let bs58pk_key = account.bs58pk;

            assert.isOk(bs58pk_key);
        });

        it("should be a string", function () {
            let bs58pk_key = account.bs58pk;

            assert.isString(bs58pk_key);
        });

        it("should not be an empty string", function () {
            let bs58pk_key = account.bs58pk;

            assert.notEqual(bs58pk_key, '');
        });
    });

    describe("Test public_key_hash()", function () {

        it("should be defined", function () {
            let pk_hash = account.public_key_hash;

            assert.isDefined(pk_hash);
        });

        it("should neither null nor undefined", function () {
            let pk_hash = account.public_key_hash;

            assert.exists(pk_hash);
        });

        it("should be truthy", function () {
            let pk_hash = account.public_key_hash;

            assert.isOk(pk_hash);
        });

        it("should be a string", function () {
            let pk_hash = account.public_key_hash;

            assert.isString(pk_hash);
        });

        it("should not be an empty string", function () {
            let pk_hash = account.public_key_hash;

            assert.notEqual(pk_hash, '');
        });
    });

    describe("Test accountpk()", function () {

        it("should be defined", function () {
            let acc_pk = account.accountpk;

            assert.isDefined(acc_pk);
        });

        it("should neither null nor undefined", function () {
            let acc_pk = account.accountpk;

            assert.exists(acc_pk);
        });

        it("should be truthy", function () {
            let acc_pk = account.accountpk;

            assert.isOk(acc_pk);
        });

        it("should be a string", function () {
            let acc_pk = account.accountpk;

            assert.isString(acc_pk);
        });

        it("should not be an empty string", function () {
            let acc_pk = account.accountpk;

            assert.notEqual(acc_pk, '');
        });
    });

    describe("Test User Initialization", function () {

        it("should neither null nor undefined", function () {
            let user = account.is_user_initialized;

            assert.exists(user);
        });

        it("should be truthy", function () {
            let user = account.is_user_initialized;

            assert.isOk(user);
        });

        it("should be true", function () {
            let user = account.is_user_initialized;

            assert.isTrue(user);
        });
    });

    describe("Test password encryption", function () {

        it("should neither empty nor undefined", function () {
            let pwd_encrypt = account.getCryptPassword(account_config.password);

            assert.exists(pwd_encrypt);
        });

        it("should be a string", function () {
            let pwd_encrypt = account.getCryptPassword(account_config.password);

            assert.isString(pwd_encrypt);
        });

        it("should match with the encrypted password", function () {
            let pwd_encrypt = account.getCryptPassword(account_config.password);
            let salt = createHash('sha256').update(account_config.password).digest('hex');
            let pwdhex = createHash('sha256').update(salt).digest('hex');

            assert.equal(pwd_encrypt, pwdhex);
        });
    });

    describe("Test connsymmkey value", function () {

        it("should set a value to m_connsymmkey", function () {
            account.connsymmkey = account_config.connsymmkey;
            let connsymmkey_value = account.connsymmkey;

            assert.equal(connsymmkey_value, account_config.connsymmkey);
        });

        it("should neither null nor undefined", function () {
            let connsymmkey_value = account.connsymmkey;

            assert.exists(connsymmkey_value);
        });

        it("should match with the account object's m_connsymmkey", function () {
            let connsymmkey_value = account.connsymmkey;

            assert.equal(connsymmkey_value, account.m_connsymmkey);
        });
    });

    describe("Test clear()", function () {

        it("should set ppkikey value to null", function () {
            account.clear();

            assert.isNull(account.ppkikey);
        });
    });

    describe("Test addToDB()", function () {

        it("should set the value of error object undefined", function (done) {

            account.create_account(account_config.account, account_config.password, function (err) {

                assert.isUndefined(err);
                done();
            });

        });
    });

    describe("Test init()", function () {

        it("should define the config.account value", function (done) {

            account.init(function () {

                assert.exists(config.account);
                done();
            })
        });
    });

    describe("Test create_account()", function () {

        it("should have a ppkikey value", function (done) {

            account.create_account(account_config.account, account_config.password, function () {

                assert.exists(account.ppkikey);
                done();
            });
        });

        it("should have a connsymmkey value", function (done) {

            account.create_account(account_config.account, account_config.password, function () {

                assert.exists(account.connsymmkey);
                done();
            });
        });

        it("should have a accountname value", function (done) {

            account.create_account(account_config.account, account_config.password, function () {

                assert.exists(account.accountname);
                done();
            });
        });

        it("should have a public_key_hash value", function (done) {

            account.create_account(account_config.account, account_config.password, function () {

                assert.exists(account.public_key_hash);
                done();
            });
        });

        it("should have a bs58pk value", function (done) {

            account.create_account(account_config.account, account_config.password, function () {

                assert.exists(account.bs58pk);
                done();
            });
        });
    });

    describe("Test load_account()", function () {

        it("should execute account_load()", function (done) {

            account.init(function () {

                let db = new Database();

                db.data(account_config.account, function (err, data) {

                    account.load_account(account_config, data, account_config.password, function () {

                        console.log("account_load() executed");
                        done();
                    });

                });
            })
        });
    });

    describe("Test load()", function () {

        it("should execute load()", function (done) {

            account.load(account_config.account, account_config.password, function () {
                console.log("load() executed");
                done();
            })

        });
    });
});
