'use strict';

import { Buffer } from 'safe-buffer';
import { BC_INVALID_SCRIPTSIG_KEY, BC_INVALID_SCRIPTSIG_PAYLOAD, BC_INPUTSIG_VALIDATE_DATA, BC_INPUTSIG_VALIDATE_DERSIG, SUCCESS, BC_INPUTSIG_VALIDATE_FAILED, BC_INPUTSIG_VALIDATE_EXCEPTION, BC_INVALID_INPUTDATA, BC_INVALID_OUTPUTTYPE, BC_ADDOUTPUT_FAILED, BC_INVALID_OUTPUTDATA, BC_INPUTVALIDATE_NOSIGN, BC_INPUTSIG_VALIDATE_NOSIGHASH, BC_TXVALIDATE_INPUTOBJ, BC_INPUTVALIDATE_EXCEPTION, BC_INVALID_FORGPARAM, BC_INVALID_PREVTXN, BC_INVALID_PREVBLOCK, BC_INVALID_FORGAMOUNT, BC_INVALID_NODEID, BC_INVALID_PUBLICKEY, BC_INVALID_STARTTIME, BC_INVALID_DISTANCE, BC_INVALID_FORGDATA, BC_INVALID_INPUTTYPE, BC_INVALIDTXTYPE, BC_TXVALIDATE_NOINPUT, BC_TXVALIDATE_INPUTHEXPARSE, BC_INPUTVALIDATE_DUPLICATE, BC_TXVALIDATE_INPUTVALIDATE, BC_TXVALIDATE_EXCEPTION, BC_INVALID_INPUTS, BC_INVALID_OUTPUTS, BC_INVALIDTXFIELDS, BC_TOBUFFER_ERR, BC_INVALID_TXHEX, BC_INVALID_VOUT, BC_INVALID_TXRCPTKEY, BC_ADDINPUT } from 'streembit-errcodes';
import { BcBase } from '../bcbase.js';
import { sha256, hash256 } from './crypto.js';
import { not_vout } from './constants.js';
import { fromPublicKeyHex } from './bckey.js';

import { decode } from 'bs58check';

const TTypes = {
    DATA: 0x01,     // Forge coin generation transaction
    FORG: 0x02,     // Register data in the blockchain
    P2PKH: 0x03,    // Public key to Public ke hash
    P2SH: 0x04,     // Public key to script hash
    SCON: 0x05,     // Public key to generic smart contract
    MULT: 0x06,     // Multi signature transaction 
    RES4: 0x07,     // reserved
    RES5: 0x08,     // reserved
    RES6: 0x09,     // reserved
    RES7: 0x0a,     // reserved
    RES8: 0x0b,     // reserved
    RES9: 0x0c,     // reserved
    RES10: 0x0d,    // reserved 
    RES11: 0x0d,    // reserved 
    RES12: 0x0e,    // reserved 
    RES13: 0x0f,    // reserved 
    RES14: 0x10,    // reserved 
    NOOUT: 0xFFF0,  // reserved 
    MAXT: 0xFFFF
};

class InputSig {
    constructor() {
    }

    // 
    // payload could be publickey for P2PKH, serialized script for P2SH, etc.
    //
    static create(key, data) {
        try {
            if (!key) {
                return BC_INVALID_SCRIPTSIG_KEY;
            }
            if (!data || (typeof data != "string" && !(data instanceof Buffer))) {
                return BC_INVALID_SCRIPTSIG_PAYLOAD;
            }

            let signature = key.sign(data);
            let derSign = signature.toDER();
            return Buffer.from(derSign).toString("hex");
        }
        catch (err) {
            return BC_INVALID_SCRIPTSIG_KEY;
        }
    }

    static verify(key, dersig, data) {
        try {
            if (!data || !(data instanceof Buffer)) {
                return BC_INPUTSIG_VALIDATE_DATA;
            }
            if (!dersig || typeof dersig != "string") {
                return BC_INPUTSIG_VALIDATE_DERSIG;
            }

            let derbuf = Buffer.from(dersig, "hex");
            let valid = key.verify(data, derbuf);

            return valid ? SUCCESS : BC_INPUTSIG_VALIDATE_FAILED;
        }
        catch (err) {
            return BC_INPUTSIG_VALIDATE_EXCEPTION
        }
    }
}

class TxOutput {
    constructor() {
        this.type = 0;
        this.value = 0;
        this.data = 0;
    }

    createTextOutput(options) {
        if (!options || !options.data || typeof options.data !== "string") {
            return BC_INVALID_INPUTDATA;
        }
        if (!options.value || !Number.isInteger(options.value) || options.value > Number.MAX_SAFE_INTEGER) {
            return BC_INVALID_INPUTDATA;
        }

        this.value = options.value;
        this.data = options.data;

        return SUCCESS;
    }

    create(options) {
        let outtype = options.type;
        if (!Number.isInteger(outtype) || outtype < 1 || outtype > TTypes.MAXT) {
            return BC_INVALID_OUTPUTTYPE;
        }
        this.type = outtype;

        let result;
        switch (outtype) {
            case TTypes.P2PKH:
                result = this.createTextOutput(options);
                break;
            case TTypes.NOOUT:
                // there is no output, no processing needed
                result = SUCCESS;
                break;
            default:
                return BC_INVALID_OUTPUTTYPE;
        }

        if (result != SUCCESS) {
            return result ? result : BC_ADDOUTPUT_FAILED;
        }

        if (this.type != TTypes.NOOUT && !this.data) {
            return BC_INVALID_OUTPUTDATA;
        }

        return SUCCESS;
    }

    serialize() {
        let data = {
            type: this.type,
            value: this.value,
            data: this.data
        };
        return data;
    }
}

class TxInput {
    constructor() {
        this.type = 0;
        this.prevtx = 0;
        this.data = 0;
        this.outidx = -1;
        this.signatureHash = 0;
        this.sig = 0;
        this.pkikey = 0;
        this.pubkey = 0;
    }

    verifysig() {
        if (!this.sig) {
            return BC_INPUTVALIDATE_NOSIGN;
        }
        if (!this.signatureHash) {
            return BC_INPUTSIG_VALIDATE_NOSIGHASH;
        }

        return InputSig.verify(this.pkikey, this.sig, this.signatureHash);
    }

    validate() {
        try {
            if (!this.pubkey || !this.data || !this.type || !Number.isInteger(this.outidx)) {
                return BC_TXVALIDATE_INPUTOBJ;
            }

            let keybuf = decode(this.pubkey);
            let pubkeyhex = Buffer.from(keybuf, "hex");
            this.pkikey = fromPublicKeyHex(pubkeyhex);

            // the signature is the HASH256 of the data
            this.signatureHash = sha256(this.data);

            return this.verifysig();

            //
        }
        catch (err) {
            return BC_INPUTVALIDATE_EXCEPTION;
        }
    }

    createP2pkhInput(options) {
        if (!options) {
            return BC_INVALID_FORGPARAM;
        }

        this.outidx = options.vout;

        this.prevtx = options.data;
        if (!this.prevtx || typeof this.prevtx != "string" || this.prevtx.length < 64) {
            return BC_INVALID_PREVTXN;
        }

        this.data = this.prevtx;

        return SUCCESS;
    }

    createForgeInput(options) {
        if (!options) {
            return BC_INVALID_FORGPARAM;
        }

        this.outidx = options.vout;

        try {
            let data = options.data;
            if (!data.prevblock || typeof data.prevblock != "string" || data.prevblock.length < 64) {
                return BC_INVALID_PREVBLOCK;
            }
            if (!data.amount) {
                return BC_INVALID_FORGAMOUNT;
            }
            if (!data.nodeid || typeof data.nodeid != "string") {
                return BC_INVALID_NODEID;
            }
            if (!data.publickey) {
                return BC_INVALID_PUBLICKEY;
            }
            if (!data.starttime) {
                return BC_INVALID_STARTTIME;
            }
            if (!data.distance) {
                return BC_INVALID_DISTANCE;
            }

            this.data = JSON.stringify(data);
        }
        catch (err) {
            return BC_INVALID_FORGDATA;
        }

        return SUCCESS;
    }

    createDataInput(options) {
        if (!options || !options.data || typeof options.data !== "string") {
            return BC_INVALID_INPUTDATA;
        }

        // must be a hex string
        try {
            let parsed = Buffer.from(options.data, "hex");
            if (!parsed || !parsed.length) {
                return BC_INVALID_INPUTDATA;
            }
        }
        catch (err) {
            return BC_INVALID_INPUTDATA;
        }

        this.outidx = not_vout; // no vout
        this.data = options.data;

        return SUCCESS;
    }

    create(options) {
        let intype = options.intype;
        if (!intype) {
            return BC_INVALID_INPUTTYPE;
        }
        this.type = intype;

        if (!options.bckey) {
            return BC_INVALID_SCRIPTSIG_KEY;
        }
        this.pkikey = options.bckey;

        let result;
        switch (intype) {
            case TTypes.P2PKH:
                result = this.createP2pkhInput(options);
                break;
            case TTypes.FORG:
                result = this.createForgeInput(options);
                break;
            case TTypes.DATA:
                result = this.createDataInput(options);
                break;
            default:
                return BC_INVALIDTXTYPE
        }

        if (result != SUCCESS) {
            return result;
        }

        if (!this.data) {
            return BC_INVALID_INPUTDATA;
        }

        // get signature
        // create a HASH256 from the data
        this.signatureHash = sha256(this.data);
        let sigresult = InputSig.create(options.bckey, this.signatureHash);
        if (BcBase.isBcError(sigresult)) {
            return sigresult;
        }

        this.sig = sigresult;

        return SUCCESS;
    }

    serialize() {
        let data = {
            type: this.type,
            prevtx: this.prevtx,
            data: this.data,
            outidx: this.outidx,
            pubkey: this.pkikey.encodedPublicKey, // encoded public key 
            sig: this.sig
        };
        return data;
    }

    static Deserialize(param) {
        let input = Object.assign(new TxInput(), param);
        return input;
    }
}

class Transaction extends BcBase {
    constructor() {
        super();
        this.version = 1;
        this.type = 0;
        this.inputs = [];
        this.outputs = [];
        this.buffer = 0;
        this.utxoset = 0;
        this.utxoparam = 0;
        this.timestamp = 0;
    }

    validate() {
        try {
            //  validate each the inputs
            if (!this.inputs || !Array.isArray(this.inputs)) {
                return BC_TXVALIDATE_NOINPUT
            }

            let inputsarr = [];
            for (let i = 0; i < this.inputs.length; i++) {
                try {
                    let input = TxInput.Deserialize(this.inputs[i]);
                    inputsarr.push(input);
                }
                catch (err) {
                    return BC_TXVALIDATE_INPUTHEXPARSE
                }
            }

            if (!inputsarr.length) {
                return BC_TXVALIDATE_NOINPUT;
            }

            // check the inputs to validate duplication of inputs
            let inputdata = [];
            inputsarr.forEach((input) => { inputdata.push(input.data) });

            const isduplicate = function (arr) {
                return arr.filter((value, index, array) => array.indexOf(value) !== index);
            }

            let duplicate = isduplicate(inputdata);
            if (duplicate && duplicate.length > 0) {
                return BC_INPUTVALIDATE_DUPLICATE;
            }

            for (let i = 0; i < inputsarr.length; i++) {
                try {
                    let result = inputsarr[i].validate();
                    if (result != SUCCESS) {
                        return result;
                    }
                }
                catch (err) {
                    return BC_TXVALIDATE_INPUTVALIDATE
                }
            }

            // TODO check if the amount of inputs not exceeds the amount of outputs

            return SUCCESS;
        }
        catch (err) {
            return BC_TXVALIDATE_EXCEPTION;
        }
    }

    createUtxos() {
        // get the total output values values
        // compare the input and output values

        let redeems = [];
        for (let i = 0; i < this.inputs.length; i++) {
            let input = this.inputs[i];
            if (input.type &&
                (input.type != Transaction.TYPES.NOOUT && input.type != Transaction.TYPES.FORG && input.type != Transaction.TYPES.DATA)) {
                if (!input.prevtx || !input.prevtx.length) {
                    return BC_INVALID_PREVTXN;
                }
                total += output.value;
                redeems.push(input);
            }
        }

        let total = 0;
        // create the utxoset
        this.utxoset = [];
        this.outputs.forEach(
            (output) => {
                if (output.value > 0) {
                    total += output.value;
                    this.utxoset.push(output);
                }
            }
        );

        let utxoparam = {
            totalout: total,
            redeems: redeems
        };

        this.utxoparam = utxoparam;

        return SUCCESS;
        //
    }

    create(params) {
        if (!Number.isInteger(params.type) || params.type < 1 || params.type > TTypes.MAXT) {
            return super.throwError(BC_INVALID_INPUTTYPE);
        }
        if (!params.inputs || !Array.isArray(params.inputs) || !params.inputs.length) {
            return super.throwError(BC_INVALID_INPUTS);
        }
        if (!params.outputs || !Array.isArray(params.outputs) || !params.outputs.length) {
            return super.throwError(BC_INVALID_OUTPUTS);
        }

        this.type = params.type;

        for (let i = 0; i < params.inputs.length; i++) {
            let result = this.addInput(params.inputs[i]);
            if (result != SUCCESS) {
                return super.throwError(result);
            }
        }

        for (let i = 0; i < params.outputs.length; i++) {
            let result = this.addOutput(params.outputs[i]);
            if (result != SUCCESS) {
                return super.throwError(result);
            }
        }

        // set the timestamp to UTC time
        //this.timestamp = Date.now();
    }

    toBuffer() {
        // don't let progress if there is no data exists in the transaction
        if (!this.version || !this.type || !this.inputs || !this.outputs || !this.inputs.length || !this.outputs.length) {
            return super.throwError(BC_INVALIDTXFIELDS);
        }

        try {
            let fields = {
                version: this.version,
                type: this.type,
                inputs: this.inputs,
                outputs: this.outputs //,
                //timestamp: this.timestamp
            };
            let str = JSON.stringify(fields);
            this.buffer = Buffer.from(str);

            return this.buffer;
        }
        catch (err) {
            super.throwError(BC_TOBUFFER_ERR, err);
        }
    }

    static InputsFromHex(hex) {
        let tx = Transaction.fromHex(hex);
        return tx.inputs;
    }

    static OutputsFromHex(hex) {
        let tx = Transaction.fromHex(hex);
        return tx.outputs;
    }

    static fromHex(hex) {
        try {
            let buffer = Buffer.from(hex, 'hex');
            let strobj = buffer.toString();
            let obj = JSON.parse(strobj);

            let tx = new Transaction();
            Object.assign(tx, obj);
            if (!tx.version || !tx.type || !tx.inputs || !tx.outputs || !tx.inputs.length || !tx.outputs.length) {
                throw new Error("invalid data");
            }

            return tx;
        }
        catch (err) {
            BcBase.err(BC_INVALID_TXHEX, err);
        }
    }

    toHex() {
        this.toBuffer();
        return this.buffer.toString("hex");
    }

    isForgeTxHash(buffer) {
    }

    isForgeTx() {
    }

    // data = a message, transaction hash hex string, etc
    // index = the index of output 
    // pkikey = PKI key associated with the recipient of transaction
    // reuturn value: SUCCESS (0) or an erro code
    addInput(params) {
        try {
            let type = params.type, data = params.data, vout = params.vout, bckey = params.bckey;
            if (!Number.isInteger(type) || type > TTypes.MAXT) {
                return BC_INVALID_INPUTTYPE;
            }
            if (!data) {
                return BC_INVALID_INPUTDATA;
            }
            if (!Number.isInteger(vout) || vout < 0) {
                return BC_INVALID_VOUT;
            }
            if (!bckey) {
                return BC_INVALID_TXRCPTKEY;
            }

            let input = new TxInput();
            let params = {
                intype: type,
                data: data,
                vout: vout,
                bckey: bckey
            };
            let result = input.create(params);
            if (result != SUCCESS) {
                return result;
            }

            // add the serialized input to the inputs list
            this.inputs.push(input.serialize());

            return SUCCESS;
            //
        }
        catch (err) {
            return BC_ADDINPUT;
        }
    }

    addOutput(params) {
        let output = new TxOutput();
        let result = output.create(params);
        if (result != SUCCESS) {
            return result;
        }

        // add the serialized output to the outputs list
        this.outputs.push(output.serialize());

        return SUCCESS;
    }

    byteLength() {
    }

    clone() {

    }

    getHash() {
        return hash256(this.toBuffer());
    }

    getHashHex() {
        return this.getHash().toString("hex");
    }

    getId() {
        return this.getHash().reverse().toString('hex');
    }

    //
    // Verify the transaction is valid based on rules that are unique to each Tx types 
    //
    verify() {

    }

}

export default Transaction;
export const TYPES = TTypes;