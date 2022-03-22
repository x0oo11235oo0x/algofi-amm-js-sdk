const algosdk = require("algosdk")
const algofi = require("../.")

const m =
  "demand mammal diagram lesson brain goddess wheat home cannon mesh define embrace detail fury omit sun into horse wedding ancient deny inmate judge able neutral"
const a = "7D2WH4PUXER2RRWNYTZRPDTL6XJNOIRKIWU572BXAXCWNOSMFN6QIBPSZA"
const sk = algosdk.mnemonicToSecretKey(m).sk

async function test() {
  let client = new algosdk.Algodv2(
    "",
    "https://algoexplorerapi.io",
    ""
  )

  console.log("TESTING")
  let a_client = new algofi.AlgofiAMMClient(client, algofi.Network.MAINNET)
  
  let asset1_id = 31566704
  let asset2_id = 465865291
  let pool = await a_client.getPool(algofi.PoolType.NANOSWAP, asset2_id, asset1_id)
  console.log(pool.poolType)
  console.log(pool.asset1Id)
  console.log(pool.asset2Id)
  //console.log(pool.logicSig.address())
  console.log("pool=", pool)
  console.log("pool.asset1Balance=", pool.asset1Balance)
  console.log("pool.asset2Balance=", pool.asset2Balance)
  // console.log("pool.getSwapExactForQuote(1,503556)=", pool.getSwapForExactQuote(465865291, 244131))
  // console.log("pool.getSwapExactForQuote(1,503556)=", pool.getSwapForExactQuote(31566704, 121522))
  // let amt = 1395705
  //console.log(pool.binarySearch(-9, 4, function (x) {return x}))
  console.log(pool.getSwapExactForQuote(this.asset2Id, 100))
  console.log(pool.asset1Balance/pool.asset2Balance)
  let r = pool.asset1Balance / pool.asset2Balance
  let s = 100000
  let x = Math.floor(r * s / (1 + r))
  let y = s - x
  
  let q = await pool.getNanoUnzapQuote(asset2_id, 5e5, 1e6)
  let p = await pool.getMaxNanoUnzapQuote(asset1_id, 1e6)
  console.log(q)
  console.log(p)
  let txns = await pool.getNanoUnzapTxns(a, asset1_id, 5e5, 1e6, 10000)
  
  // let q1 = await pool.getMaxNanoUnzapQuote(asset1_id, 2e6)
  // let q2 = await pool.getMaxNanoUnzapQuote(asset2_id, 2e6)
  // console.log(q1)
  // console.log(q2)
  // console.log(x, y)
  // console.log(pool.asset1Balance / pool.asset2Balance)
  // console.log(eval(Math.round(100000*1e6 * r).toFixed()), 100000*1e6)
  // let q = await pool.getNanoZapQuote(175779 * 1e6, 0) // r = A/B B=rA
  // let p = pool.getPoolQuote(asset1_id, eval(Math.round(100000*1e6 * r).toFixed()), eval(Math.round(100000*1e6 * r).toFixed()), 100000*1e6)
  // console.log('aaa')
  // console.log(q)
  // console.log(p)
  // console.log(q.lpDelta/p.lpDelta)
  
  // let txns = await pool.getNanoZapTransactions(a, s, 0, 10000, false, false, true)
  // let stxns = txns.map(x => algosdk.signTransaction(x, sk).blob)
  // let response = await client.sendRawTransaction(stxns).do()
  //console.log(response)
  // console.log(pool.asset1Balance - q.asset1Delta)
  // console.log(pool.asset2Balance - q.asset2Delta)
  // // console.log("pool.getSwapExactForQuote(1,1e6)=", pool.getSwapExactForQuote(77279127, 1e6))
  // // console.log("pool.getSwapExactForQuote(1,1e7)=", pool.getSwapExactForQuote(77279127, 1e7))
  // // console.log("pool.getSwapExactForQuote(1,1e8)=", pool.getSwapExactForQuote(77279127, 1e8))
  // let q = pool.getPoolQuote(31566704, 1000000)
  // let txns = await pool.getPoolTxns(a, asset2_id,  1394650, 1396765, false, true, 5000)
  // let stxns = txns.map(x => algosdk.signTransaction(x, sk).blob)
  // let response = await client.sendRawTransaction(stxns).do()
  // console.log(response)
  
  
  /*
  const zapInAsset = 1 // ALGO
  const zapOutAsset = 51436723 // goBTC
  const pool = await a_client.getPool(algofi.PoolType.CONSTANT_PRODUCT_30BP_FEE, zapInAsset, zapOutAsset)
  console.log("pool=", pool)
  console.log("pool.asset1Balance=", pool.asset1Balance)
  console.log("pool.asset2Balance=", pool.asset2Balance)
  const zapInAmount = 1 * 1e6 // 11 ALGO
  const maximumSlippage = 1000 * 1 // 1%
  const sender = "MWWNJV6ZVXI52IA2HRN5CWYY6FCNV22PAVJDXCUOWHXUQG7QPEWLBHJFSY"

  const txns = await pool.getZapLPTransactions(sender, zapInAsset, zapInAmount, maximumSlippage, true, true)
  //console.log("txns=", txns)
  const seed =
    "execute teach purpose spy random banner sail rather ozone lumber popular cattle cliff tumble title bicycle erode faculty bonus drum duck elder mansion ability essay"
  */
  //console.log("txns=", txns)

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
