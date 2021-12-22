

'use strict';

const errcodes = require('streembit-errcodes');
const constants = require('./bcjs/constants');

class BcBase {
    constructor() {
    }

    throwError(errno, err) {  
        var errobj = {
            errno: errno || errcodes.BC_ERROR
        };
        if (err) {
            if (BcBase.isBcError(err)) {
                // the err is avalid errcode as well
                errobj.suberrno = err;
            }
            else {
                if (err.message) {
                    errobj.message = err.message;
                }
                if (err.stack) {
                    errobj.stack = err.stack;
                }
            }
        }
        var msg = JSON.stringify(errobj);
        throw new Error(msg);
    }

    static isBcError(err) {
        return (Number.isInteger(err) && err > 0 && err < errcodes.MAX_ERROR_CODE);
    }

    static err(errno, err) {
        var c = new BcBase();
        c.throwError(errno, err);
    }

    // 
    // parse a transaction hex buffer
    // 
    parseTx(tx) {
        try {
            if (!tx || typeof tx != "string") {
                return errcodes.BC_INVALID_TXPARAM;
            }
        }
        catch (err) {
            return errcodes.BC_PARSE_TX;
        }
    }
}

module.exports.BcBase = BcBase;
