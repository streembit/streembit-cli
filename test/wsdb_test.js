import { assert } from "chai";
import { res } from "../resolvedir.js";
import sqlite3 from "sqlite3";
import dbschema from "../dbschematest.json";
import Database from "streembit-db";
import { config } from "../libs/config/index.js";
import ws_config from "./test_config.json";
import { WsDb } from "../libs/database/wsdb.js";

const database = Database.instance;

describe("WSBD database module libs/database/wsdb", function () {
  let wsdb, client1, client2, client3;

  const sq3 = new sqlite3.Database(
    `db/sqlite/${ws_config.dbname}/${ws_config.dbname}.db`,
    sqlite3.OPEN_READONLY
  );

  function _count() {
    return new Promise((resolve, reject) => {
      sq3.get("SELECT COUNT(*) as total FROM wsclients", [], (err, row) => {
        if (err) {
          throw new Error(err.message);
        }

        return resolve(row);
      });
    });
  }

  function _verify(cid) {
    return new Promise((resolve, reject) => {
      sq3.get(
        "SELECT * FROM wsclients WHERE clientid = ?",
        [cid],
        (err, row) => {
          if (err) {
            throw new Error(err.message);
          }

          return resolve(row);
        }
      );
    });
  }

  before(function (done) {
    config.init(ws_config.port, ws_config.host, false, false, function () {
      config.database_name = ws_config.database;
      database.init(dbschema, async function () {
        wsdb = new WsDb();
        await wsdb.delete_client(1);
        await wsdb.delete_client(2);
        await wsdb.delete_client(3);

        client1 = ws_config.wsclients[0];
        client2 = ws_config.wsclients[1];
        client3 = ws_config.wsclients[2];

        done();
      });
    });
  });

  describe("WSDB: add, update wsclients records", function () {
    it("should use wsdb.add_client to add 2 new clients", function () {
      return wsdb
        .add_client(
          client1.pkhash,
          client1.publickey,
          client1.token,
          client1.isactive,
          client1.account
        )
        .then(() =>
          wsdb.add_client(
            client2.pkhash,
            client2.publickey,
            client2.token,
            client2.isactive,
            client2.account
          )
        )
        .then(() =>
          _count().then((res) => {
            assert.equal(res.total, 2);
          })
        );
    });

    it("should use wsdb.update_client to update token and isactive of client with ID#1", function () {
      return wsdb.update_client(client1.pkhash, "NEW_TOKEN", 0).then(() =>
        _verify(1).then((res) => {
          assert.equal(res.token, "NEW_TOKEN");
          assert.equal(res.isactive, 0);
        })
      );
    });
  });

  describe("WSDB: get records", function () {
    it("should use wsdb.get_clients to get all records from wsclients", function () {
      return wsdb.get_clients().then(() =>
        _count()
          .then((res) => {
            assert.equal(res.total, 2);
          })
          .then(() =>
            _verify(1)
              .then((res) => {
                assert.equal(res.publickey, client1.publickey);
              })
              .then(() =>
                _verify(2).then((res) => {
                  assert.equal(res.publickey, client2.publickey);
                })
              )
          )
      );
    });

    it("should use wsdb.get_client to get a client by pkhash", function () {
      return wsdb.get_client(client1.pkhash).then(() =>
        _verify(1).then((res) => {
          assert.equal(res.publickey, client1.publickey);
        })
      );
    });
  });

  describe("WSDB: register client", function () {
    it("should use wsdb.register to add client", function () {
      return wsdb
        .register(
          client3.pkhash,
          client3.publickey,
          client3.token,
          client3.account
        )
        .then(() =>
          _count()
            .then((res) => {
              assert.equal(res.total, 3);
            })
            .then(() =>
              _verify(3).then((res) => {
                assert.equal(res.publickey, client3.publickey);
              })
            )
        );
    });
    it("should use wsdb.register to update client", function () {
      return wsdb
        .register(
          client3.pkhash,
          client3.publickey,
          "NEW_TOKEN",
          client3.account
        )
        .then(() =>
          _verify(3).then((res) => {
            assert.equal(res.token, "NEW_TOKEN");
          })
        );
    });
  });

  describe("WSDB: delete records", function () {
    it("should use wsdb.delete_client to remove a client by ID", function () {
      return wsdb.delete_client(3).then(() =>
        _count().then((res) => {
          assert.equal(res.total, 2);
        })
      );
    });
    it("should use wsdb.delete_all_clients to drop records off wsclients", function () {
      return wsdb.delete_all_clients().then(() =>
        _count().then((res) => {
          assert.equal(res.total, 0);
        })
      );
    });
  });
});
