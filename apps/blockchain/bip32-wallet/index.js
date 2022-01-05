import { each } from 'async'
import { Chain, Account, discovery } from '../bip32-utils'
import { sortInputs, sortOutputs } from 'bip69'
import { networks, address as _address, TransactionBuilder, HDNode } from '../bcjs/index.js'

let NETWORKS = networks

class Wallet {
  constructor(external, internal) {
    let chains
    if (Array.isArray(external)) {
      chains = external
      this.external = chains[0].getParent()
      this.internal = chains[1].getParent()
    } else {
      chains = [new Chain(external), new Chain(internal)]

      this.external = external
      this.internal = internal
    }

    this.account = new Account(chains)
  }
  buildTransaction(inputs, outputs, feeMax, external, internal, nLockTime) {
    if (!isFinite(feeMax))
      throw new TypeError('Expected finite maximum fee')
    if (feeMax > 0.2 * 1e8)
      throw new Error('Maximum fee is absurd: ' + feeMax)

    external = external || this.external
    internal = internal || this.internal
    let network = this.getNetwork()

    // sanity checks
    let inputValue = inputs.reduce(function (a, x) { return a + x.value }, 0)
    let outputValue = outputs.reduce(function (a, x) { return a + x.value }, 0)
    if (outputValue > inputValue)
      throw new Error('Not enough funds: ' + inputValue + ' < ' + outputValue)

    // clone the internal chain to avoid inadvertently moving the wallet forward before usage
    let chain = this.account.getChain(1).clone()

    // map outputs to be BIP69 compatible
    // add missing change outputs
    outputs = outputs.map(function (output) {
      let script = output.script
      if (!script && output.address) {
        script = _address.toOutputScript(output.address, network)
      }

      if (!script) {
        script = _address.toOutputScript(chain.get(), network)
        chain.next()
      }

      return {
        script: script,
        value: output.value
      }
    })

    let fee = inputValue - outputValue
    if (fee > feeMax)
      throw new Error('Fee is too high: ' + feeMax)

    // apply BIP69 for improved privacy
    inputs = sortInputs(inputs.concat())
    outputs = sortOutputs(outputs)

    // get associated private keys
    let addresses = inputs.map(function (input) { return input.address })
    let children = this.account.getChildren(addresses, [external, internal])

    // build transaction
    let txb = new TransactionBuilder(network)

    if (nLockTime !== undefined) {
      txb.setLockTime(nLockTime)
    }

    inputs.forEach(function (input) {
      txb.addInput(input.txId, input.vout, input.sequence, input.prevOutScript)
    })

    outputs.forEach(function (output) {
      txb.addOutput(output.script, output.value)
    })

    // sign and return
    children.forEach(function (child, i) {
      txb.sign(i, child.keyPair)
    })

    return {
      fee: fee,
      transaction: txb.build()
    }
  }
  containsAddress(address) { return this.account.containsAddress(address) }
  discover(gapLimit, queryCallback, done) {
    function discoverChain(chain, callback) {
      discovery(chain, gapLimit, queryCallback, function (err, used, checked) {
        if (err)
          return callback(err)

        // throw away ALL unused addresses AFTER the last unused address
        let unused = checked - used
        for (let i = 1; i < unused; ++i)
          chain.pop()

        callback()
      })
    }

    each(this.account.getChains(), discoverChain, done)
  }
  getAllAddresses() { return this.account.getAllAddresses() }
  getNetwork() { return this.account.getNetwork() }
  getReceiveAddress() { return this.account.getChainAddress(0) }
  getChangeAddress() { return this.account.getChainAddress(1) }
  isReceiveAddress(address) { return this.account.isChainAddress(0, address) }
  isChangeAddress(address) { return this.account.isChainAddress(1, address) }
  nextReceiveAddress() { return this.account.nextChainAddress(0) }
  nextChangeAddress() { return this.account.nextChainAddress(1) }
  toJSON() {
    let chains = this.account.chains.map(function (chain) {
      return {
        k: chain.k,
        map: chain.map,
        node: chain.getParent().toBase58()
      }
    })

    return {
      external: chains[0],
      internal: chains[1]
    }
  }
  static fromJSON(json, network) {
    function toChain(cjson) {
      let node = HDNode.fromBase58(cjson.node, network)
      let chain = new Chain(node, cjson.k)
      chain.map = cjson.map
      chain.addresses = Object.keys(chain.map).sort(function (a, b) {
        return chain.map[a] - chain.map[b]
      })

      return chain
    }

    let chains
    if (json.chains) {
      chains = json.chains.map(toChain)
    } else if (json.external) {
      chains = [toChain(json.external), toChain(json.internal)]
    }

    return new Wallet(chains)
  }
  static fromSeedBuffer(seed, network) {
    network = network || NETWORKS.bitcoin

    // HD first-level child derivation method should be hardened
    // See https://bitcointalk.org/index.php?topic=405179.msg4415254#msg4415254
    let m = HDNode.fromSeedBuffer(seed, network)
    let i = m.deriveHardened(0)
    let external = i.derive(0)
    let internal = i.derive(1)

    return new Wallet(external, internal)
  }
  static fromSeedHex(hex, network) {
    return Wallet.fromSeedBuffer(new Buffer(hex, 'hex'), network)
  }
}







export default Wallet
