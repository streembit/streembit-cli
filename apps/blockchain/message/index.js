import { decode } from 'bs58check';
import bufferEquals from 'buffer-equals';
import createHash from 'create-hash';
import { BcKey } from '../bcjs/index.js';
import BN from 'bn.js';
import { encodingLength, encode } from 'letuint-bitcoin';


function sha256(b) {
  return createHash('sha256').update(b).digest()
}
function hash256(buffer) {
  return sha256(sha256(buffer))
}
function hash160(buffer) {
  return createHash('ripemd160').update(sha256(buffer)).digest()
}

function encodeSignature(signature, recovery, compressed) {
  if (compressed) recovery += 4
  return Buffer.concat([Buffer.alloc(1, recovery + 27), signature])
}

function decodeSignature(buffer) {
  if (buffer.length !== 65) throw new Error('Invalid signature length')

  let flagByte = buffer.readUInt8(0) - 27
  if (flagByte > 7) throw new Error('Invalid signature parameter')

  return {
    compressed: !!(flagByte & 4),
    recovery: flagByte & 3,
    signature: buffer.slice(1)
  }
}

function magicHash(message, messagePrefix) {
  messagePrefix = messagePrefix || '\u0018Bitcoin Signed Message:\n'
  if (!Buffer.isBuffer(messagePrefix)) messagePrefix = Buffer.from(messagePrefix, 'utf8')

  let messageVISize = encodingLength(message.length)
  let buffer = Buffer.allocUnsafe(messagePrefix.length + messageVISize + message.length)
  messagePrefix.copy(buffer, 0)
  encode(message.length, buffer, messagePrefix.length)
  buffer.write(message, messagePrefix.length + messageVISize)
  return hash256(buffer)
}

function sign(message, privateKey, compressed, messagePrefix) {
  let hash = magicHash(message, messagePrefix);
  let keyPair = BcKey.fromPrivateKey(privateKey);
  let sigObj = keyPair.sign(hash);
  let signature = Buffer.concat([sigObj.r.toArrayLike(Buffer, 'be', 32), sigObj.s.toArrayLike(Buffer, 'be', 32)]);
  return encodeSignature(signature, sigObj.recoveryParam, compressed);
}

function recover(message, signature, recovery, compressed) {
  let sigObj = { r: signature.slice(0, 32), s: signature.slice(32, 64) }

  let key = new BcKey();
  let sigr = new BN(sigObj.r)
  let sigs = new BN(sigObj.s)
  if (sigr.cmp(key.curve.n) >= 0 || sigs.cmp(key.curve.n) >= 0) {
    throw new Error('couldn\'t parse signature')
  }

  try {
    if (sigr.isZero() || sigs.isZero()) {
      throw new Error("isZero validation failed.")
    }

    let point = key.recoverPubKey(message, sigObj, recovery)
    return Buffer.from(point.encode(true, compressed))
  }
  catch (err) {
    throw new Error('Recovering public key from signature error: ' + err.message);
  }
}

function verify(message, address, signature, messagePrefix) {
  if (!Buffer.isBuffer(signature)) {
    signature = Buffer.from(signature, 'base64')
  }

  let parsed = decodeSignature(signature)
  let hash = magicHash(message, messagePrefix)
  let publicKey = recover(hash, parsed.signature, parsed.recovery, parsed.compressed)

  let actual = hash160(publicKey)
  let expected = decode(address).slice(1)

  return bufferEquals(actual, expected)
}
export {
  magicHash,
  sign,
  verify
}

