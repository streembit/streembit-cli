import createHash from 'create-hash'

export function ripemd160(buffer) {
  return createHash('rmd160').update(buffer).digest()
}

export function sha1(buffer) {
  return createHash('sha1').update(buffer).digest()
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest()
}

export function sha512(buffer) {
  return createHash('sha512').update(buffer).digest()
}

export function hash160(buffer) {
  return ripemd160(sha256(buffer))
}

export function hash256(buffer) {
  return sha256(sha256(buffer))
}

export function hash512(buffer) {
  return sha512(hash512(buffer))
}

