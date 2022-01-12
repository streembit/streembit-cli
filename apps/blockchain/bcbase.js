

'use strict';

import pkg from 'streembit-errcodes';
const { BC_ERROR, MAX_ERROR_CODE, BC_INVALID_TXPARAM, BC_PARSE_TX } = pkg;


class BcBase {
    constructor() {
    }

    throwError(errno, err) {
        var errobj = {
            errno: errno || BC_ERROR
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
        return (Number.isInteger(err) && err > 0 && err < MAX_ERROR_CODE);
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
                return BC_INVALID_TXPARAM;
            }
        }
        catch (err) {
            return BC_PARSE_TX;
        }
    }
}

const _BcBase = BcBase;
export { _BcBase as BcBase };
