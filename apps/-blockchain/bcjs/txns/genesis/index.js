const Transaction = require('../../../bcjs').Transaction;

function template(bckey) {
    var txparams = {
        type: Transaction.TYPES.DATA,
        inputs: [
            {
                type: Transaction.TYPES.DATA,
                data: Buffer.from("Streembit blockchain genesis block").toString("hex"),
                bckey: bckey,
                vout: 0
            }
        ],
        outputs: [
            {
                type: Transaction.TYPES.NOOUT
            }
        ]
    };

    var tx = new Transaction();
    tx.create(txparams);

    return tx;
}

module.exports = template;
