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
 * Function to get approval and clear state programs of an application
 *
 * @param   {Algodv2}           algodClient
 *
 * @return  {int8Array[]}
 */
export async function getApplicationPrograms(algodClient: Algodv2, applicationId : number): Promise<Uint8Array[]> {
  let response = await algodClient.getApplicationByID(applicationId).do()
  const enc = new TextEncoder()
  return [enc.encode(response.params["approval-program"]), enc.encode(response.params["clear-state-program"])]
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