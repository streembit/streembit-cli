import { decode as _decode, encode } from 'bip66'
import typeforce from 'typeforce'
import { tuple, BigInt, BufferN } from './types.js'

import { fromBuffer, fromDERInteger } from 'bigi'

class ECSignature {
  constructor(r, s) {
    typeforce(tuple(BigInt, BigInt), arguments)

    this.r = r
    this.s = s
  }
  toCompact(i, compressed) {
    if (compressed) {
      i += 4
    }

    i += 27

    let buffer = Buffer.alloc(65)
    buffer.writeUInt8(i, 0)
    this.toRSBuffer(buffer, 1)
    return buffer
  }
  toDER() {
    let r = Buffer.from(this.r.toDERInteger())
    let s = Buffer.from(this.s.toDERInteger())

    return encode(r, s)
  }
  toRSBuffer(buffer, offset) {
    buffer = buffer || Buffer.alloc(64)
    this.r.toBuffer(32).copy(buffer, offset)
    this.s.toBuffer(32).copy(buffer, offset + 32)
    return buffer
  }
  toScriptSignature(hashType) {
    let hashTypeMod = hashType & ~0x80
    if (hashTypeMod <= 0 || hashTypeMod >= 4)
      throw new Error('Invalid hashType ' + hashType)

    let hashTypeBuffer = Buffer.alloc(1)
    hashTypeBuffer.writeUInt8(hashType, 0)

    return Buffer.concat([this.toDER(), hashTypeBuffer])
  }
  static parseCompact(buffer) {
    typeforce(BufferN(65), buffer)

    let flagByte = buffer.readUInt8(0) - 27
    if (flagByte !== (flagByte & 7))
      throw new Error('Invalid signature parameter')

    let compressed = !!(flagByte & 4)
    let recoveryParam = flagByte & 3
    let signature = ECSignature.fromRSBuffer(buffer.slice(1))

    return {
      compressed: compressed,
      i: recoveryParam,
      signature: signature
    }
  }
  static fromRSBuffer(buffer) {
    typeforce(BufferN(64), buffer)

    let r = fromBuffer(buffer.slice(0, 32))
    let s = fromBuffer(buffer.slice(32, 64))
    return new ECSignature(r, s)
  }
  static fromDER(buffer) {
    let decode = _decode(buffer)
    let r = fromDERInteger(decode.r)
    let s = fromDERInteger(decode.s)

    return new ECSignature(r, s)
  }
  // BIP62: 1 byte hashType flag (only 0x01, 0x02, 0x03, 0x81, 0x82 and 0x83 are allowed)
  static parseScriptSignature(buffer) {
    let hashType = buffer.readUInt8(buffer.length - 1)
    let hashTypeMod = hashType & ~0x80

    if (hashTypeMod <= 0x00 || hashTypeMod >= 0x04)
      throw new Error('Invalid hashType ' + hashType)

    return {
      signature: ECSignature.fromDER(buffer.slice(0, -1)),
      hashType: hashType
    }
  }
}


export default ECSignature
