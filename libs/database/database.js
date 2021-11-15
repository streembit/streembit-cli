// const dbinstance = require("streembit-db").instance;
// const config = require("libs/config");
import { config } from '../config/index.js';
import Database from "streembit-db";
const dbinstance = Database.instance;

export class database {
    constructor() {
        this.m_database = 0;
    }

    get database () {
        if(!config.database_name){
            throw new Error("database_name is missing from the configuration file.");
        }
        const dbnamekey = config.database_name;

        if (!this.m_database) {
            this.m_database = dbinstance.databases[dbnamekey];
        }
        return this.m_database;
    }

    set database (db) {
        this.m_database = db;
    }
}


// module.exports = database;