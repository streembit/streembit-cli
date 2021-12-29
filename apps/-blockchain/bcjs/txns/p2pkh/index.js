import { Transaction } from '../../../bcjs';

function template(bckey, prevtx, outidx, address, totalout, amount, changeaddress) {
    let change = totalout - amount;
    let txparams = {
        type: Transaction.TYPES.P2PKH,
        inputs: [
            {
                bckey: bckey,
                type: Transaction.TYPES.P2PKH,
                data: prevtx,
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

    let tx = new Transaction();
    tx.create(txparams);

    return tx;
}

export default template;
