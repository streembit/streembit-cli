const bs58check = require('bs58check');
const bufferEquals = require('buffer-equals');
const createHash = require('create-hash');
const BcKey = require('../bcjs').BcKey;
const BN = require('bn.js');
const varuint = require('varuint-bitcoin');


function sha256 (b) {
  return createHash('sha256').update(b).digest()
}
function hash256 (buffer) {
  return sha256(sha256(buffer))
}
function hash160 (buffer) {
  return createHash('ripemd160').update(sha256(buffer)).digest()
}

function encodeSignature (signature, recovery, compressed) {
  if (compressed) recovery += 4
  return Buffer.concat([Buffer.alloc(1, recovery + 27), signature])
}

function decodeSignature (buffer) {
  if (buffer.length !== 65) throw new Error('Invalid signature length')

  var flagByte = buffer.readUInt8(0) - 27
  if (flagByte > 7) throw new Error('Invalid signature parameter')

  return {
    compressed: !!(flagByte & 4),
    recovery: flagByte & 3,
    signature: buffer.slice(1)
  }
}

function magicHash (message, messagePrefix) {
  messagePrefix = messagePrefix || '\u0018Bitcoin Signed Message:\n'
  if (!Buffer.isBuffer(messagePrefix)) messagePrefix = Buffer.from(messagePrefix, 'utf8')

  var messageVISize = varuint.encodingLength(message.length)
  var buffer = Buffer.allocUnsafe(messagePrefix.length + messageVISize + message.length)
  messagePrefix.copy(buffer, 0)
  varuint.encode(message.length, buffer, messagePrefix.length)
  buffer.write(message, messagePrefix.length + messageVISize)
  return hash256(buffer)
}

function sign (message, privateKey, compressed, messagePrefix) {
  var hash = magicHash(message, messagePrefix);
  var keyPair = BcKey.fromPrivateKey(privateKey);
  var sigObj = keyPair.sign(hash);
  var signature = Buffer.concat([sigObj.r.toArrayLike(Buffer, 'be', 32), sigObj.s.toArrayLike(Buffer, 'be', 32)]);
  return encodeSignature(signature, sigObj.recoveryParam, compressed);
}

function recover (message, signature, recovery, compressed) {
  var sigObj = { r: signature.slice(0, 32), s: signature.slice(32, 64) }

  var key = new BcKey();
  var sigr = new BN(sigObj.r)
  var sigs = new BN(sigObj.s)
  if (sigr.cmp(key.curve.n) >= 0 || sigs.cmp(key.curve.n) >= 0) {
    throw new Error('couldn\'t parse signature')
  }

  try {
    if (sigr.isZero() || sigs.isZero()) {
      throw new Error("isZero validation failed.")
    }

    var point = key.recoverPubKey(message, sigObj, recovery)
    return Buffer.from(point.encode(true, compressed))
  } 
  catch (err) {
    throw new Error('Recovering public key from signature error: ' + err.message);
  }
}

function verify (message, address, signature, messagePrefix) {
  if (!Buffer.isBuffer(signature)) {
    signature = Buffer.from(signature, 'base64')
  }

  var parsed = decodeSignature(signature)
  var hash = magicHash(message, messagePrefix)
  var publicKey = recover(hash, parsed.signature, parsed.recovery, parsed.compressed)

  var actual = hash160(publicKey)
  var expected = bs58check.decode(address).slice(1)

  return bufferEquals(actual, expected)
}

module.exports = {
  magicHash: magicHash,
  sign: sign,
  verify: verify
}
