import algosdk, { Algodv2, SuggestedParams, Transaction } from "algosdk"

/**
 * Function that returns standard transaction parameters
 * 
 * @param {Algodv2} algodClient
 * 
 * @return params
 */
export async function getParams(algodClient: Algodv2): Promise<SuggestedParams> {
  let params = await algodClient.getTransactionParams().do()
  params.fee = 1000
  params.flatFee = true
  return params
}

/**
 * Function to generate payment or asset transfer transactions
 *
 * @param   {SuggestedParams}   params
 * @param   {string}            sender
 * @param   {string}            receiver
 * @param   {int}               assetId
 * @param   {int}               amount
 * 
 * @return  {Payment or AssetTransfer Transaction}
 */
export function getPaymentTxn(
  params : SuggestedParams,
  sender : string,
  receiver : string,
  assetId : number,
  amount : number
):Transaction {
  if (assetId == 1) { // send algos
    const algoPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: receiver,
        amount: amount,
        suggestedParams: params,
        rekeyTo: undefined,
    })
    return algoPayment

  } else {
    const asaPayment = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: sender,
        to: receiver,
        amount: amount,
        assetIndex: assetId,
        suggestedParams: params,
        rekeyTo: undefined,
        revocationTarget: undefined
    })
    return asaPayment
  }
}