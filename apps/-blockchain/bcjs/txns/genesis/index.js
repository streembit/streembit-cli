import { Transaction } from '../../../bcjs';

function template(bckey) {
    let txparams = {
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

    let tx = new Transaction();
    tx.create(txparams);

    return tx;
}

export default template;
