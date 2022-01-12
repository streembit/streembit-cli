import { HDNode } from '../bcjs/index.js'
import discovery from './discovery'

import Chain from './chain'

class Account {
  constructor(chains) {
    this.chains = chains
  }
  clone() {
    return new Account(this.chains.map(function (chain) {
      return chain.clone()
    }))
  }
  containsAddress(address) {
    return this.chains.some(function (chain) {
      return chain.find(address) !== undefined
    })
  }
  // optional parents argument for private key escalation
  derive(address, parents) {
    var derived

    this.chains.some(function (chain, i) {
      derived = chain.derive(address, parents && parents[i])
      return derived
    })

    return derived
  }
  discoverChain(i, gapLimit, queryCallback, callback) {
    var chains = this.chains
    var chain = chains[i].clone()

    discovery(chain, gapLimit, queryCallback, function (err, used, checked) {
      if (err)
        return callback(err)

      // throw away EACH unused address AFTER the last unused address
      var unused = checked - used
      for (var j = 1; j < unused; ++j)
        chain.pop()

      // override the internal chain
      chains[i] = chain

      callback()
    })
  }
  getAllAddresses() {
    return [].concat.apply([], this.chains.map(function (chain) {
      return chain.getAll()
    }))
  }
  getChain(i) { return this.chains[i] }
  getChains() { return this.chains }
  getChainAddress(i) { return this.chains[i].get() }
  getNetwork() { return this.chains[0].getParent().keyPair.network }
  isChainAddress(i, address) {
    return this.chains[i].find(address) !== undefined
  }
  nextChainAddress(i) {
    return this.chains[i].next()
  }
  toJSON() {
    return this.chains.map(function (chain) {
      return {
        k: chain.k,
        map: chain.map,
        node: chain.getParent().toBase58()
      }
    })
  }
  static fromJSON(json, network, addressFunction) {
    var chains = json.map(function (j) {
      var node = HDNode.fromBase58(j.node, network)

      var chain = new Chain(node, j.k, addressFunction)
      chain.map = j.map

      // derive from k map
      chain.addresses = Object.keys(chain.map).sort(function (a, b) {
        return chain.map[a] - chain.map[b]
      })

      return chain
    })

    return new Account(chains)
  }
}











export default Account
