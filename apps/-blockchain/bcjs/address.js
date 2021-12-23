import { Buffer } from 'safe-buffer'
import { decode, fromWords, toWords, encode } from 'bech32'
import { decode as _decode, encode as _encode } from 'bs58check'
import { osmio } from './networks.js'
import typeforce from 'typeforce'
import { tuple, Hash160bit } from './types.js'

export function fromBase58Check(address) {
    var payload = _decode(address)

    // TODO: 4.0.0, move to "toOutputScript"
    if (payload.length < 21) throw new TypeError(address + ' is too short')
    if (payload.length > 21) throw new TypeError(address + ' is too long')

    var version = payload.readUInt8(0)
    var hash = payload.slice(1)

    return {
        version: version,
        hash: hash
    }
}

export function fromBech32(address) {
    var result = decode(address)
    var data = fromWords(result.words.slice(1))

    return {
        version: result.words[0],
        prefix: result.prefix,
        data: Buffer.from(data)
    }
}

export function toBase58Check(hash, version) {
    typeforce(tuple(Hash160bit, UInt8), arguments)

    var payload = Buffer.allocUnsafe(21)
    payload.writeUInt8(version, 0)
    hash.copy(payload, 1)

    return _encode(payload)
}

export function toBech32(data, version, prefix) {
    var words = toWords(data)
    words.unshift(version)

    return encode(prefix, words)
}

export function fromOutputScript(outputScript, network) {

}

export function toOutputScript(address, network) {
    network = network || osmio

}

