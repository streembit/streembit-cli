const Transaction = require('../../../bcjs').Transaction;

function template(bckey, address, amount, forgeinfo) {
    forgeinfo.amount = amount;
    var txparams = {
        type: Transaction.TYPES.FORG,
        inputs: [
            {
                type: Transaction.TYPES.FORG,
                data: forgeinfo,
                bckey: bckey,
                vout: 0
            }
        ],
        outputs: [
            {
                type: Transaction.TYPES.P2PKH,
                value: amount,
                data: address               
            }
        ]
    };

    var tx = new Transaction();
    tx.create(txparams);

    return tx;
}

module.exports = template;
