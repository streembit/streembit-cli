import { assert } from "chai";
import { res } from "../resolvedir.js";
import dbschema from "../dbschematest.json";
import Database from "streembit-db";
import AccountsDb from "../libs/database/accountdb.js";
import { config } from "../libs/config/index.js";
import ws_config from "./test_config.json";
import sqlite3 from "sqlite3";

const database = Database.instance;

describe("AccountDB database module libs/database/accountdb", function () {
  let accountdb, account1, password;

  const sq3 = new sqlite3.Database(
    `db/sqlite/${ws_config.dbname}/${ws_config.dbname}.db`,
    sqlite3.OPEN_READWRITE
  );

  before(function (done) {
    config.init(ws_config.port, ws_config.host, false, false, function () {
      config.database_name = ws_config.database;
      database.init(dbschema, async function () {
        accountdb = new AccountsDb();

        account1 = ws_config.accounts[0];
        password = "pass550rd";
        await sq3.run("DELETE FROM accounts", (err, state) => {});
        console.log("doneeeeeeeeeeeeeeeee");
        done();
      });
    });
  });

  describe("AccountDB: get and add records", function () {
    it("should use accountdb.add to add new account", function (done) {
      return accountdb.add(
        account1.account,
        account1.accountpk,
        password,
        account1.cipher,
        (err, row) => {
          assert.isUndefined(err);
          done();
        }
      );
    });

    it("should use accountdb.data to get first account", function () {
      return accountdb.data((err, row) => {
        assert.isUndefined(err);
        assert.equal(row.accountpk, account1.accountpk);
      });
    });

    it("should use accountdb.databyname to get account by account name", function () {
      return accountdb.databyname(account1.account, (err, row) => {
        assert.isUndefined(err);
        assert.equal(row.accountpk, account1.accountpk);
      });
    });
  });
});
