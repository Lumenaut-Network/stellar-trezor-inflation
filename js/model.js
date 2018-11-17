const TrezorConnect = window.TrezorConnect;
const {Network, Operation, TransactionBuilder} = StellarSdk;
const {Transaction, Server, Keypair, xdr} = StellarSdk;
const server = new Server('https://horizon.stellar.org');
const bip32Path = "m/44'/148'/0'";

Network.usePublicNetwork();

const get_account_id = async ()=>{
    let res = await TrezorConnect.stellarGetAddress({ path: bip32Path });
    if (!res.success)
        throw new Error('Read address error: '+res.payload.error);
    return res.payload.address;
};

const hex_to_arr = hex=>{
    let len = hex.length/2;
    let arr = new Uint8Array(len);
    for (let i=0; i<len; i++)
        arr[i] = parseInt(hex.substring(i*2, i*2+2), 16);
    return arr;
};

const sign_transaction = async transaction=>{
    // Trezor shows error if any of 'null' fields are missing
    let params = {
        path: bip32Path,
        networkPassphrase: Network.current().networkPassphrase(),
        transaction: {
            source: transaction.source,
            sequence: transaction.sequence,
            fee: transaction.fee,
            memo: {type: 0},
            operations: [{
                type: 'setOptions',
                inflationDest: transaction.operations[0].inflationDest,
                signer: {
                    type: null,
                    weight: null,
                },
                clearFlags: null,
                setFlags: null,
                masterWeight: null,
                lowThreshold: null,
                highThreshold: null,
            }],
        },
    };
    let res = await TrezorConnect.stellarSignTransaction(params);
    if (!res.success)
        throw new Error('Sign error: '+res.payload.error);
    return hex_to_arr(res.payload.signature);
};

const build_xdr = async (account_id, inflation_dest)=>{
    if (!account_id)
        throw new Error('Account ID is not specified');
    if (!inflation_dest)
        throw new Error('Inflation dest is not specified');

    let account = await server.loadAccount(account_id);
    console.log('Account loaded:', account);

    if (account.inflation_destination==inflation_dest)
        throw new Error('This inflation destination is ALREADY SET');

    let transaction = new TransactionBuilder(account)
        .addOperation(Operation.setOptions({inflationDest: inflation_dest}))
        .build();
    console.log('Transaction:', transaction)

    let signature = await sign_transaction(transaction);
    console.log('Signature:', signature);

    let decorated_signature = new xdr.DecoratedSignature({
        signature,
        hint: Keypair.fromPublicKey(transaction.source).signatureHint(),
    });
    console.log('Decorated signature:', decorated_signature);

    transaction.signatures.push(decorated_signature);
    return transaction.toEnvelope().toXDR().toString('base64');
}

const submit_transaction = async xdr=>{
    if (!xdr)
        throw new Error('XDR is not yet built');
    let transaction = new Transaction(xdr);
    let res = await server.submitTransaction(transaction);
    console.log('submitTransaction:', res);
    return res.hash;
};