// https://en.bitcoin.it/wiki/List_of_address_prefixes
// Dogecoin BIP32 is a proposed standard: https://bitcointalk.org/index.php?topic=409731

export const bitcoin = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80
};
export const testnet = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tb',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef
};
export const litecoin = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
};
export const osmio = {
  messagePrefix: '\x21Osmio Signed Message:\n',
  bip32: {
    public: 0x2e6fec4d,
    private: 0x2e6fbcbc
  },
  pubKeyHash: 0x08,
  scriptHash: 0x0b,
  wif: 0xda
};
export const osmiotestnet = {
  messagePrefix: '\x21Osmio Signed Message:\n',
  bip32: {
    public: 0x3e6fec4d,
    private: 0x3e6fec4d
  },
  pubKeyHash: 0x40,
  scriptHash: 0x44,
  wif: 0xef
};
