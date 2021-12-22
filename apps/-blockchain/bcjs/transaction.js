'use strict';

const Buffer = require('safe-buffer').Buffer;
const errcodes = require('streembit-errcodes');
const BcBase = require('../bcbase').BcBase;
const NodeInfo = require('../bcnode/nodeinfo');
const bcrypto = require('./crypto');
const constants = require('./constants');
const BcKey = require('./bckey');
const util = require('util');
const bs58check = require('bs58check');

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
                return errcodes.BC_INVALID_SCRIPTSIG_KEY;
            }
            if (!data || (typeof data != "string" && !(data instanceof Buffer))) {
                return errcodes.BC_INVALID_SCRIPTSIG_PAYLOAD;
            }

            var signature = key.sign(data);
            var derSign = signature.toDER();
            return Buffer.from(derSign).toString("hex");
        }
        catch (err) {
            return errcodes.BC_INVALID_SCRIPTSIG_KEY;
        }
    }

    static verify(key, dersig, data) {
        try {
            if (!data || !(data instanceof Buffer)) {
                return errcodes.BC_INPUTSIG_VALIDATE_DATA;
            }
            if (!dersig || typeof dersig != "string") {
                return errcodes.BC_INPUTSIG_VALIDATE_DERSIG;
            }

            var derbuf = Buffer.from(dersig, "hex");
            var valid = key.verify(data, derbuf);

            return valid ? errcodes.SUCCESS : errcodes.BC_INPUTSIG_VALIDATE_FAILED;
        }
        catch (err) {
            return errcodes.BC_INPUTSIG_VALIDATE_EXCEPTION
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
            return errcodes.BC_INVALID_INPUTDATA;
        }
        if (!options.value || !Number.isInteger(options.value) || options.value > Number.MAX_SAFE_INTEGER) {
            return errcodes.BC_INVALID_INPUTDATA;
        }

        this.value = options.value;
        this.data = options.data;

        return errcodes.SUCCESS;
    }

    create(options) {
        var outtype = options.type;
        if (!Number.isInteger(outtype) || outtype < 1 || outtype > TTypes.MAXT) {
            return errcodes.BC_INVALID_OUTPUTTYPE;
        }
        this.type = outtype;

        var result;
        switch (outtype) {
            case TTypes.P2PKH:
                result = this.createTextOutput(options);
                break;
            case TTypes.NOOUT:
                // there is no output, no processing needed
                result = errcodes.SUCCESS;
                break;
            default:
                return errcodes.BC_INVALID_OUTPUTTYPE;
        }

        if (result != errcodes.SUCCESS) {
            return result ? result : errcodes.BC_ADDOUTPUT_FAILED;
        }

        if (this.type != TTypes.NOOUT && !this.data) {
            return errcodes.BC_INVALID_OUTPUTDATA;
        }

        return errcodes.SUCCESS;
    }

    serialize() {
        var data = {
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
            return errcodes.BC_INPUTVALIDATE_NOSIGN;
        }
        if (!this.signatureHash) {
            return errcodes.BC_INPUTSIG_VALIDATE_NOSIGHASH;
        }        

        return InputSig.verify(this.pkikey, this.sig, this.signatureHash);
    }

    validate() {
        try {
            if (!this.pubkey || !this.data || !this.type || !Number.isInteger(this.outidx)) {
                return errcodes.BC_TXVALIDATE_INPUTOBJ;
            }

            var keybuf = bs58check.decode(this.pubkey);
            var pubkeyhex = Buffer.from(keybuf, "hex");
            this.pkikey = BcKey.fromPublicKeyHex(pubkeyhex);

            // the signature is the HASH256 of the data
            this.signatureHash = bcrypto.sha256(this.data); 

            return this.verifysig();

            //
        }
        catch (err) {
            return errcodes.BC_INPUTVALIDATE_EXCEPTION;
        }
    }

    createP2pkhInput(options) {
        if (!options) {
            return errcodes.BC_INVALID_FORGPARAM;
        }

        this.outidx = options.vout;

        this.prevtx = options.data;
        if (!this.prevtx || typeof this.prevtx != "string" || this.prevtx.length < 64) {
            return errcodes.BC_INVALID_PREVTXN;
        }

        this.data = this.prevtx;

        return errcodes.SUCCESS;
    }

    createForgeInput(options) {
        if (!options) {
            return errcodes.BC_INVALID_FORGPARAM;
        }   

        this.outidx = options.vout;

        try {
            var data = options.data;
            if (!data.prevblock || typeof data.prevblock != "string" || data.prevblock.length < 64) {
                return errcodes.BC_INVALID_PREVBLOCK;
            }
            if (!data.amount) {
                return errcodes.BC_INVALID_FORGAMOUNT;
            }
            if (!data.nodeid || typeof data.nodeid != "string" ) {
                return errcodes.BC_INVALID_NODEID;
            }
            if (!data.publickey) {
                return errcodes.BC_INVALID_PUBLICKEY;
            }
            if (!data.starttime) {
                return errcodes.BC_INVALID_STARTTIME;
            }
            if (!data.distance) {
                return errcodes.BC_INVALID_DISTANCE;
            }

            this.data = JSON.stringify(data); 
        }
        catch (err) {
            return errcodes.BC_INVALID_FORGDATA;
        }
        
        return errcodes.SUCCESS;
    }

    createDataInput(options) {
        if (!options || !options.data || typeof options.data !== "string") {
            return errcodes.BC_INVALID_INPUTDATA;
        }

        // must be a hex string
        try {
            var parsed = Buffer.from(options.data, "hex");
            if (!parsed || !parsed.length) {
                return errcodes.BC_INVALID_INPUTDATA;
            }
        }
        catch (err) {
            return errcodes.BC_INVALID_INPUTDATA;
        }

        this.outidx = constants.not_vout; // no vout
        this.data = options.data;

        return errcodes.SUCCESS;
    }

    create(options) {
        var intype = options.intype;
        if (!intype) {
            return errcodes.BC_INVALID_INPUTTYPE;
        }
        this.type = intype;

        if (!options.bckey) {
            return errcodes.BC_INVALID_SCRIPTSIG_KEY;
        }
        this.pkikey = options.bckey;

        var result;
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
                return errcodes.BC_INVALIDTXTYPE
        }

        if (result != errcodes.SUCCESS) {
            return result;
        }

        if (!this.data) {
            return errcodes.BC_INVALID_INPUTDATA;
        }

        // get signature
        // create a HASH256 from the data
        this.signatureHash = bcrypto.sha256(this.data); 
        var sigresult = InputSig.create(options.bckey, this.signatureHash);
        if (BcBase.isBcError(sigresult)) {
            return sigresult;
        }

        this.sig = sigresult;

        return errcodes.SUCCESS;
    }
    
    serialize() {
        var data = {
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
        var input = Object.assign(new TxInput(), param);
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
            if (!this.inputs || !Array.isArray(this.inputs)){
                return errcodes.BC_TXVALIDATE_NOINPUT
            }

            var inputsarr = [];
            for (let i = 0; i < this.inputs.length; i++) {
                try {
                    var input = TxInput.Deserialize(this.inputs[i]);
                    inputsarr.push(input);
                }
                catch (err) {
                    return errcodes.BC_TXVALIDATE_INPUTHEXPARSE
                }
            }

            if (!inputsarr.length) {
                return errcodes.BC_TXVALIDATE_NOINPUT;
            }

            // check the inputs to validate duplication of inputs
            let inputdata = [];
            inputsarr.forEach((input) => { inputdata.push(input.data) });

            const isduplicate = function(arr) {
                return arr.filter((value, index, array) => array.indexOf(value) !== index);
            }

            var duplicate = isduplicate(inputdata);
            if (duplicate && duplicate.length > 0) {
                return errcodes.BC_INPUTVALIDATE_DUPLICATE;
            }

            for (let i = 0; i < inputsarr.length; i++) {
                try {
                    let result = inputsarr[i].validate();
                    if (result != errcodes.SUCCESS) {
                        return result;
                    }
                }
                catch (err) {
                    return errcodes.BC_TXVALIDATE_INPUTVALIDATE
                }
            }

            // TODO check if the amount of inputs not exceeds the amount of outputs

            return errcodes.SUCCESS;
        }
        catch (err) {
            return errcodes.BC_TXVALIDATE_EXCEPTION;
        }
    }

    createUtxos() {
        // get the total output values values
        // compare the input and output values

        var redeems = [];
        for (var i = 0; i < this.inputs.length; i ++ ){
            let input = this.inputs[i];
            if (input.type &&
                (input.type != Transaction.TYPES.NOOUT && input.type != Transaction.TYPES.FORG && input.type != Transaction.TYPES.DATA)) {
                if (!input.prevtx || !input.prevtx.length) {
                    return errcodes.BC_INVALID_PREVTXN;
                }
                total += output.value;
                redeems.push(input);
            }
        }

        var total = 0;
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

        var utxoparam = {
            totalout: total,
            redeems: redeems
        };

        this.utxoparam = utxoparam;

        return errcodes.SUCCESS;
        //
    }

    create(params) {
        if (!Number.isInteger(params.type) || params.type < 1 || params.type > TTypes.MAXT) {
            return super.throwError(errcodes.BC_INVALID_INPUTTYPE);
        }
        if (!params.inputs || !Array.isArray(params.inputs) || !params.inputs.length) {
            return super.throwError(errcodes.BC_INVALID_INPUTS);
        }
        if (!params.outputs || !Array.isArray(params.outputs) || !params.outputs.length) {
            return super.throwError(errcodes.BC_INVALID_OUTPUTS);
        }

        this.type = params.type;

        for (var i = 0; i < params.inputs.length; i++ ){
            var result = this.addInput(params.inputs[i]);
            if (result != errcodes.SUCCESS) {
                return super.throwError(result);
            }
        }

        for (var i = 0; i < params.outputs.length; i++) {
            var result = this.addOutput(params.outputs[i]);
            if (result != errcodes.SUCCESS) {
                return super.throwError(result);
            }
        }

        // set the timestamp to UTC time
        //this.timestamp = Date.now();
    }

    toBuffer() {
        // don't let progress if there is no data exists in the transaction
        if (!this.version || !this.type || !this.inputs || !this.outputs || !this.inputs.length || !this.outputs.length) {
            return super.throwError(errcodes.BC_INVALIDTXFIELDS);
        }

        try {       
            var fields = {
                version: this.version,
                type: this.type,
                inputs: this.inputs,
                outputs: this.outputs //,
                //timestamp: this.timestamp
            };
            var str = JSON.stringify(fields);
            this.buffer = Buffer.from(str);

            return this.buffer;
        }
        catch (err) {
            super.throwError(errcodes.BC_TOBUFFER_ERR, err);
        }
    }

    static InputsFromHex(hex) {
        var tx = Transaction.fromHex(hex);
        return tx.inputs;
    }

    static OutputsFromHex(hex) {
        var tx = Transaction.fromHex(hex);
        return tx.outputs;
    }

    static fromHex(hex) {        
        try {
            var buffer = Buffer.from(hex, 'hex');
            var strobj = buffer.toString();
            var obj = JSON.parse(strobj);

            var tx = new Transaction();
            Object.assign(tx, obj);
            if (!tx.version || !tx.type || !tx.inputs || !tx.outputs || !tx.inputs.length || !tx.outputs.length) {
                throw new Error("invalid data");
            }

            return tx;
        }
        catch (err) {
            BcBase.err(errcodes.BC_INVALID_TXHEX, err);
        }
    }

    toHex(){
        this.toBuffer();
        return this.buffer.toString("hex");
    }

    isForgeTxHash (buffer) {
    }

    isForgeTx () {        
    }

    // data = a message, transaction hash hex string, etc
    // index = the index of output 
    // pkikey = PKI key associated with the recipient of transaction
    // reuturn value: SUCCESS (0) or an erro code
    addInput(params) {
        try {
            var type = params.type, data = params.data, vout = params.vout, bckey = params.bckey;
            if (!Number.isInteger(type) || type > TTypes.MAXT) {
                return errcodes.BC_INVALID_INPUTTYPE;
            }
            if (!data) {
                return errcodes.BC_INVALID_INPUTDATA;
            }
            if (!Number.isInteger(vout) || vout < 0) {
                return errcodes.BC_INVALID_VOUT;
            }
            if (!bckey) {
                return errcodes.BC_INVALID_TXRCPTKEY;
            }

            var input = new TxInput();
            var params = {
                intype: type,
                data: data,
                vout: vout,
                bckey: bckey
            };
            var result = input.create(params);
            if (result != errcodes.SUCCESS) {
                return result;
            }

            // add the serialized input to the inputs list
            this.inputs.push(input.serialize());

            return errcodes.SUCCESS;
            //
        }
        catch (err) {
            return errcodes.BC_ADDINPUT;
        }
    }

    addOutput(params) {
        var output = new TxOutput();
        var result = output.create(params);
        if (result != errcodes.SUCCESS) {
            return result;
        }

        // add the serialized output to the outputs list
        this.outputs.push(output.serialize());

        return errcodes.SUCCESS;
    }

    byteLength() {
    }

    clone() {

    }

    getHash() {
        return bcrypto.hash256(this.toBuffer());
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

module.exports = Transaction;
module.exports.TYPES = TTypes;