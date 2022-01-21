const algosdk = require("algosdk")
const algofi = require("../.")

const m = "close buffalo zoo track stay inspire alcohol green vintage noble load toward unusual critic boost chase usage slide govern follow soda jungle load absent save"
const a = "XUDFHKY3JVCYBX3K35GDMJIRHPANTATBIEAV2GBT73KTKMXFAUMBD6FZFQ"
const sk = algosdk.mnemonicToSecretKey(m).sk

async function test() {

    let client = new algosdk.Algodv2("088368839ac7de2e23fca5c15182ccd7a7df4bc5a777c1ed157a83f5382698ad","https://tn1.algofi.org/","")
    
    console.log("TESTING")
    let a_client = new algofi.AlgofiAMMClient(client, algofi.Network.TESTNET)
    
    let asset2_id = 1
    let asset1_id = 66006476
    
    let app_id = 66123220
    
    let pool = await a_client.getPool(algofi.PoolType.CONSTANT_PRODUCT_30BP_FEE, asset1_id, asset2_id)
    console.log(pool.poolType)
    console.log(pool.asset1Id)
    console.log(pool.asset2Id)
    console.log(pool.logicSig.address())

    
    if (pool.poolStatus == algofi.PoolStatus.UNINITIALIZED) {

        // CREATE APP
        //let txn = await pool.getCreatePoolTxn(a)
        //let stxn = algosdk.signTransaction(txn, sk)
        //let srt = await client.sendRawTransaction(stxn.blob).do()
        //console.log(stxn.txID)
        //let result = await algosdk.waitForConfirmation(client, stxn.txID, 100)
        //console.log(result)
        
        // register APP
        //console.log(pool.logicSig.addreess())
        //console.log("gen")
        //let txns = await pool.getInitializePoolTxns(a, app_id)
        //let gtxn = algosdk.assignGroupID(txns)
        //console.log("sign")
        //// sign txn 1
        //let stxn0 = algosdk.signTransaction(gtxn[0], sk)
        //// sign txn 2
        //let stxn1 = algosdk.signTransaction(gtxn[1], sk)
        //// sign txn 3
        //let stxn2 = algosdk.signLogicSigTransaction(gtxn[2], pool.logicSig)
        //// sign txn 4
        //let stxn3 = algosdk.signTransaction(gtxn[3], sk)
        //let stxns = [stxn0.blob, stxn1.blob, stxn2.blob, stxn3.blob]
        //console.log("send")
        //console.log(stxn3.txID)
        //let srt = await client.sendRawTransaction(stxns).do()
        //let result = await algosdk.waitForConfirmation(client, stxn3.txID, 100)
        //console.log(result)
        
    }
}

test()