const assert = require('chai').assert;
const expect = require("chai").expect;
const dbschema = require("dbschematest");
const database = require("streembit-db").instance;
const Database = require("libs/database/wsdb");
const ws_config = require('./ws_config.json');

describe("WSBD database module libs/database/wsdb", function () {
    let wsdb, client1, client2;

    before(function (done) {
        database.init(dbschema, function () {
            console.log(Database)
            wsdb = new Database('streembitsqltest');

            client1 = ws_config.wsclients[0];
            client2 = ws_config.wsclients[1];
            done();
        });
    });

    describe("Add new client to DB", function () {
        it("should add new 2 clients to database.wsclients", function () {
            wsdb.add_client(client1.pkhash, client1.public_key, client1.token, client1.isactive, client1.account)
                .then(function () {
                    return wsdb.add_client(client2.pkhash, client2.public_key, client2.token, client2.isactive, client2.account);
                })
                .catch(function (error) {
                    console.log('ERR:', error);
                })
                .finally(function() {
                    wsdb.get_activeclients_count()
                        .then(function(resp) {
                            console.log('RESP:', resp);
                        })
                })
        });
    });
});