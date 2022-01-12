import { Buffer } from 'safe-buffer';

import pkg from 'bech32';
import bs58check from 'bs58check';
const { decode, fromWords, toWords, encode } = pkg;
const { _decode = decode, _encode = encode } = bs58check;


import { osmio } from './networks.js'
import typeforce from 'typeforce'
import * as types from './types.js'

export function fromBase58Check(address) {
    let payload = _decode(address)

    // TODO: 4.0.0, move to "toOutputScript"
    if (payload.length < 21) throw new TypeError(address + ' is too short')
    if (payload.length > 21) throw new TypeError(address + ' is too long')

    let version = payload.readUInt8(0)
    let hash = payload.slice(1)

    return {
        version: version,
        hash: hash
    }
}

export function fromBech32(address) {
    let result = decode(address)
    let data = fromWords(result.words.slice(1))

    return {
        version: result.words[0],
        prefix: result.prefix,
        data: Buffer.from(data)
    }
}

export function toBase58Check(hash, version) {
    typeforce(types.tuple(types.Hash160bit, UInt8), arguments)

    let payload = Buffer.allocUnsafe(21)
    payload.writeUInt8(version, 0)
    hash.copy(payload, 1)

    return _encode(payload)
}

export function toBech32(data, version, prefix) {
    let words = toWords(data)
    words.unshift(version)

    return encode(prefix, words)
}

export function fromOutputScript(outputScript, network) {

}

export function toOutputScript(address, network) {
    network = network || osmio

}

