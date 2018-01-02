const dbinstance = require("streembit-db").instance;
const res = require('../../resolvedir');
const config = require("libs/config");

class database {
    constructor() {
        this.m_database = 0;
    }

    get database () {
        const dbnamekey = config.database_name;

        if (!this.m_database) {
            this.m_database = dbinstance.databases[dbnamekey];
        }
        return this.m_database;
    }
}

module.exports = database;