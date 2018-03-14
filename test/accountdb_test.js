const assert = require('chai').assert;
const res = require('../resolvedir');
const sqlite3 = require('sqlite3').verbose();
const dbschema = require("dbschematest");
const database = require("streembit-db").instance;
const Database = require("libs/database/accountdb");
const config = require("libs/config");
const ws_config = require('./test_config.json');

describe("AccountDB database module libs/database/accountdb", function () {
    let accountdb, account1, password;

    const sq3 = new sqlite3.Database(`db/sqlite/${ws_config.dbname}/${ws_config.dbname}.db`, sqlite3.OPEN_READWRITE);

    before(function (done) {
        config.init(ws_config.port, ws_config.host, function() {
            config.database_name = ws_config.database;
            database.init(dbschema, async function () {
                accountdb = new Database();

                account1 = ws_config.accounts[0];
                password = 'pass550rd';

                await sq3.run('DELETE FROM accounts', (err, state) => {});

                done();
            });
        });
    });

    describe("AccountDB: get and add records", function () {
        it('should use accountdb.add to add new account', function (done) {
            return accountdb.add(account1.account, account1.accountpk, password, account1.cipher, (err, row) => {
                assert.isUndefined(err);
                done();
            })
        });

        it("should use accountdb.data to get first account", function () {
            return accountdb.data((err, row) => {
                assert.isUndefined(err);
                assert.equal(row.accountpk, account1.accountpk);
            })
        });

        it("should use accountdb.databyname to get account by account name", function () {
            return accountdb.databyname(account1.account, (err, row) => {
                assert.isUndefined(err);
                assert.equal(row.accountpk, account1.accountpk);
            })
        });
    });
});
