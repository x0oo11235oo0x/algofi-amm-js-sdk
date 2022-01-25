const algosdk = require("algosdk")
const algofi = require("../.")

const m = "close buffalo zoo track stay inspire alcohol green vintage noble load toward unusual critic boost chase usage slide govern follow soda jungle load absent save"
const a = "XUDFHKY3JVCYBX3K35GDMJIRHPANTATBIEAV2GBT73KTKMXFAUMBD6FZFQ"
const sk = algosdk.mnemonicToSecretKey(m).sk

async function test() {

    let client = new algosdk.Algodv2("088368839ac7de2e23fca5c15182ccd7a7df4bc5a777c1ed157a83f5382698ad","https://tn1.algofi.org/","")
    
    console.log("TESTING")
    let a_client = new algofi.AlgofiAMMClient(client, algofi.Network.TESTNET)

    let asset1_id = 1
    let asset2_id = 51435943

    let pool = await a_client.getPool(algofi.PoolType.CONSTANT_PRODUCT_30BP_FEE, asset1_id, asset2_id)
    console.log(pool.poolType)
    console.log(pool.asset1Id)
    console.log(pool.asset2Id)
    console.log(pool.logicSig.address())
    console.log("pool=",pool)
    console.log("pool.asset1Balance=",pool.asset1Balance)
    console.log("pool.asset2Balance=",pool.asset2Balance)
    console.log("pool.getSwapExactForQuote(1,1e5)=", pool.getSwapExactForQuote(1,1e5))
    console.log("pool.getSwapExactForQuote(1,1e6)=", pool.getSwapExactForQuote(1,1e6))
    console.log("pool.getSwapExactForQuote(1,1e7)=", pool.getSwapExactForQuote(1,1e7))
    console.log("pool.getSwapExactForQuote(1,1e8)=", pool.getSwapExactForQuote(1,1e8))
//    let asset = await a_client.getAsset(asset1_id)
//    console.log(asset)
//    await asset.refreshPrice()
//    console.log(asset.price)


    //  'FM3WTT2MZAJTMYNN5OWHMBSYIYV2HONBRC7VFYOX6AZU5OFG6XGQ',
    //  '4YXWENLNFJBCWXYQFI2K6W4V3PQS47KMIRP2FXWV27I74BJ6STRA',
    //  '5UFAENSPQYHRL6ZHYTBPBCOR2J26KO4SLWMGHJEZCVCD4IVUAC7A',
    //  'COEBK5I6WFJJZXN3XU367IKIYWLHG4H5SJDZEV4EDQKAQLL4LM7Q',
    //  'DDCCLPQWUZ42RXDTM3KEMFPVBN6HCLNIBWRSI34BYDWD646HKR6A'

    //let tx_id = "5UFAENSPQYHRL6ZHYTBPBCOR2J26KO4SLWMGHJEZCVCD4IVUAC7A"
    //
    //let tx_info = await client.pendingTransactionInformation(tx_id).do()
    //console.log(tx_info["inner-txns"][0])
    
    if (pool.poolStatus == algofi.PoolStatus.UNINITIALIZED) {

        // CREATE APP
        //let txn = await pool.getCreatePoolTxn(a)
        //let stxn = algosdk.signTransaction(txn, sk)
        //console.log("works")
        //let srt = await client.sendRawTransaction(stxn.blob).do()
        //console.log(stxn.txID)
        //let result = await algosdk.waitForConfirmation(client, stxn.txID, 100)
        //console.log(result)
        
        // register APP
        //console.log(pool.logicSig.address())
        //console.log("gen")
        //let gtxn = await pool.getInitializePoolTxns(a, app_id)
        //console.log("sign")
        //// sign txn 1
        //let stxn0 = algosdk.signTransaction(gtxn[0], sk)
        //// sign txn 2
        //let stxn1 = algosdk.signTransaction(gtxn[1], sk)
        //// sign txn 3
        //let stxn2 = pool.signTxnWithLogicSig(gtxn[2])
        //// sign txn 4
        //let stxn3 = algosdk.signTransaction(gtxn[3], sk)
        //let stxns =   [stxn0.blob, stxn1.blob, stxn2.blob, stxn3.blob]
        //console.log("send")
        //console.log(stxn3.txID)
        //let srt = await client.sendRawTransaction(stxns).do()
        //let result = await algosdk.waitForConfirmation(client, stxn3.txID, 100)
        //console.log(result)
    }
    
    
    //console.log("QUOTE")
    //console.log(pool.asset1Balance)
    //console.log(pool.asset2Balance)
    //console.log(pool.lpCirculation)
    //console.log(await pool.getPoolQuote(pool.asset1Id, 10000))
    //console.log(await pool.getPoolQuote(pool.asset2Id, 10000))
    //
    //console.log(await pool.getBurnQuote(100))

    //console.log(await pool.getSwapExactForQuote(pool.asset1Id, 10000))
    //console.log(await pool.getSwapExactForQuote(pool.asset2Id, 10000))

    //console.log(await pool.getSwapForExactQuote(pool.asset1Id, 10000))
    //console.log(await pool.getSwapForExactQuote(pool.asset2Id, 10000))

    //console.log("LP OPT IN")
    //let txns = await pool.getLPTokenOptInTxn(a)
    //let stxns = txns.map(x => algosdk.signTransaction(x, sk).blob)
    //let response = await client.sendRawTransaction(stxns).do()
    //console.log(response)

    
    // Pool
    //console.log("pool")
    //let gtxns = await pool.getPoolTxns(a, 100, 200, 10000)
    ////algosdk.assignGroupID(gtxns)
    //let ids = gtxns.map(x => algosdk.signTransaction(x, sk).txID)
    //console.log(ids)
    //let stxns = gtxns.map(x => algosdk.signTransaction(x, sk).blob)
    //let response = await client.sendRawTransaction(stxns).do()
    //console.log(response)
    
    
}

test()
