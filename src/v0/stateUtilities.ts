import algosdk, { Algodv2 } from "algosdk"
import { Base64Encoder } from "./encoder"

/**
 * Function to get global state of an application
 *
 * @param   {Algodv2}           algodClient
 *
 * @return  {dict<string,int>}  dictionary of global state
 */
export async function getApplicationGlobalState(algodClient: Algodv2, applicationId : number): Promise<{}> {
  let response = await algodClient.getApplicationByID(applicationId).do()
  let results = {}

  response.params["global-state"].forEach(x => {
    results[Base64Encoder.decode(x.key)] = x.value.uint
  })
  return results
}

/**
 * Function to get local state for a given address and application
 *
 * @param   {Algodv2}           algodClient
 * @param   {string}            address
 *
 * @return  {dict<string,int>}  dictionary of user local state
 */
export async function getApplicationLocalState(algodClient: Algodv2, address : string, applicationId : number): Promise<{}> {
  let results = {}

  let accountInfo = await algodClient.accountInformation(address).do()
  accountInfo["apps-local-state"].forEach(appLocalState => {
    if (appLocalState.id == applicationId && appLocalState["key-value"]) {
      appLocalState["key-value"].forEach(x => {
        if (x.type == 1) {
          results[Base64Encoder.decode(x.key)] = x.value.bytes
        } else {
          results[Base64Encoder.decode(x.key)] = x.value.uint
        }
      })
    }
  })
  
  return results
}


/**
 * Function to get balances for an account
*
 * @param   {Algodv2}           algodClient
 * @param   {string}            address
 *
 * @return  {dict<string,int>}  dictionary of assets to amounts
 */
export async function getAccountBalances(algodClient: Algodv2, address : string): Promise<{}> {
  let results = {}

  let accountInfo = await algodClient.accountInformation(address).do()
  results[1] = accountInfo["amount"]
  accountInfo.params["assets"].forEach(x => {
    results[x["asset-id"]] = x["amount"]
  })
  return results
}
