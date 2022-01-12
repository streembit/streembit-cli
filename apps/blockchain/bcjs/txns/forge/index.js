import { Transaction } from '../../../bcjs/index.js';

export function template(bckey, address, amount, forgeinfo) {
    forgeinfo.amount = amount;
    let txparams = {
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

    let tx = new Transaction();
    tx.create(txparams);

    return tx;
}


