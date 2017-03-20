
var config = require('./config');


const LIST = 0;
const ANYCAST = 1;

class Seeds {
    constructor() {
    }

    loadConfigSeeds(callback) {
        if (!config.node || !config.node.seeds || !Array.isArray(config.node.seeds)) {
            return callback("Invalid seeds in the config file");
        }

        callback(null, config.node.seeds);
    }

    loadAnycastSeeds(callback) {

    }

    seedFactory(callback) {
        var mode = config.node.seedmode;
        switch (mode) {
            case ANYCAST:
                this.loadAnycastSeeds(callback)
                break;
            default:
                this.loadConfigSeeds(callback);
                break;
        }
    }

    load(callback) {
        return this.seedFactory(callback);
    }

}

module.exports = Seeds;