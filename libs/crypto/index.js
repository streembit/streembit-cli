"use strict";

import elliptic from "elliptic";
import bs58check from "bs58check";
import createHash from "create-hash";

const EC = elliptic.ec;

export class EccKey {
  constructor(ecccurve) {
    this.key = 0;
    this.curve = ecccurve || "secp256k1";
    this.ecobj = new EC(this.curve);
  }

  generateKey(entropy) {
    // Generate keys
    this.key = this.ecobj.genKeyPair({ entropy: entropy });
  }

  keyFromPrivate(privkeyhex) {
    // Generate keys
    if (!privkeyhex || typeof privkeyhex != "string") {
      throw new Error("Invalid private key hex at EccKey keyFromPrivate");
    }

    this.key = this.ecobj.keyFromPrivate(privkeyhex, "hex");
  }

  BS58PkToHex(bsd8pk) {
    try {
      const buffer = bs58check.decode(bsd8pk);
      const hex = buffer.toString("hex");
      return hex;
    } catch (err) {
      return null;
    }
  }

  get publicKey() {
    return this.key.getPublic();
  }

  get publicKeyHex() {
    return this.key.getPublic("hex");
  }

  get publicKeyHexCompressed() {
    return this.key.getPublic(true, "hex");
  }

  get privateKeyHex() {
    return this.key.getPrivate("hex");
  }

  get pubkeyhash() {
    const rmd160buffer = this.publicKeyrmd160;
    const bs58pk = bs58check.encode(rmd160buffer);
    return bs58pk;
  }

  get publicKeyrmd160() {
    const pkhex = this.key.getPublic("hex");
    const buffer = Buffer.from(pkhex, "hex");
    const rmd160buffer = createHash("rmd160").update(buffer).digest();
    return rmd160buffer;
  }

  get pkrmd160hash() {
    const pkhex = this.key.getPublic("hex");
    const buffer = Buffer.from(pkhex, "hex");
    const rmd160buffer = createHash("rmd160").update(buffer).digest("hex");
    return rmd160buffer;
  }

  get publicKeyBs58() {
    const pkhex = this.key.getPublic("hex");
    const buffer = Buffer.from(pkhex, "hex");
    const bs58hash = bs58check.encode(buffer);
    return bs58hash;
  }

  get privateKey() {
    return this.key.getPrivate();
  }

  get cryptoKey() {
    return this.key;
  }
}
