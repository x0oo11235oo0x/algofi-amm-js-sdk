import algosdk, { Algodv2 } from "algosdk"
import { Base64Encoder } from "./encoder"
import {
  Network,
  PoolType,
  POOL_STRINGS
} from "./config"
import {
  MAINNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT_TEXT,
  MAINNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT_TEXT,
  TESTNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT_TEXT,
  TESTNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT_TEXT,
} from "./approvalPrograms"

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
  accountInfo["assets"].forEach(x => {
    results[x["asset-id"]] = x["amount"]
  })
  return results
}

/**
 * Function to get pools created by a given user
*
 * @param   {Algodv2}           algodClient
 * @param   {Network}           network
 * @param   {string}            address
 *
 * @return  {int[]} list of application ids created by this account
 */
export async function getAccountCreatedPools(algodClient: Algodv2, network: Network, address: string): Promise<{}> {
  let results = {}
  let accountInfo = await algodClient.accountInformation(address).do()
  accountInfo["created-apps"].forEach(app =>{
    let pool_type = PoolType.CONSTANT_PRODUCT_LOW_FEE
    if (network == Network.MAINNET) {
      if (app["params"]["approval-program"] === MAINNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT_TEXT) {
        pool_type = PoolType.CONSTANT_PRODUCT_LOW_FEE
      } else if (app["params"]["approval-program"] === MAINNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT_TEXT) {
        pool_type = PoolType.CONSTANT_PRODUCT_HIGH_FEE
      } else {
        return
      }
    } else {
      if (app["params"]["approval-program"] === TESTNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT_TEXT) {
        pool_type = PoolType.CONSTANT_PRODUCT_LOW_FEE
      } else if (app["params"]["approval-program"] === TESTNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT_TEXT) {
        pool_type = PoolType.CONSTANT_PRODUCT_HIGH_FEE
      } else {
        return
      }
    }
    
    let app_state = {}
    app["params"]["global-state"].forEach(y => {
      app_state[Base64Encoder.decode(y.key)] = y.value.uint
    })
    
    let initialized = 0;
    let asset_1_id = 0;
    let asset_2_id = 0;
    
    if (POOL_STRINGS.asset1_id in app_state) {
      asset_1_id = app_state[POOL_STRINGS.asset1_id]
    }
    if (POOL_STRINGS.asset2_id in app_state) {
      asset_2_id = app_state[POOL_STRINGS.asset2_id]
    }
    if (POOL_STRINGS.initialized in app_state) {
      initialized = app_state[POOL_STRINGS.initialized]
    }
    
    results[app["id"]] = {"asset_1_id" : asset_1_id, "asset_2_id" : asset_2_id, "pool_type" : pool_type, "initialized" : initialized}
    
  })
  return results
}