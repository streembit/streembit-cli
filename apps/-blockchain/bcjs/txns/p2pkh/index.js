const Transaction = require('../../../bcjs').Transaction;

function template(bckey, prevtx, outidx, address, totalout, amount, changeaddress) {
    var change = totalout - amount;
    var txparams = {
        type: Transaction.TYPES.P2PKH,
        inputs: [
            {
                bckey: bckey,
                type: Transaction.TYPES.P2PKH,
                data:  prevtx,               
                vout: outidx
            }
        ],
        outputs: [
            {
                type: Transaction.TYPES.P2PKH,
                value: amount,
                data: address      
            },
            {
                type: Transaction.TYPES.P2PKH,
                value: change,
                data: changeaddress
            }
        ]
    };

    var tx = new Transaction();
    tx.create(txparams);

    return tx;
}

module.exports = template;
