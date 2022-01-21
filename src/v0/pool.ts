// external imports
import algosdk, { Algodv2, LogicSigAccount, Transaction, getApplicationAddress, encodeUint64, OnApplicationComplete } from "algosdk"

// internal imports
import {
  getApplicationGlobalState,
  getApplicationPrograms,
  getApplicationLocalState
} from "./stateUtilities"
import {
  getParams,
  waitForConfirmation,
  getPaymentTxn
} from "./transactionUtilities"
import {
  generateLogicSig
} from "./logicSigGenerator"
import {
  Network,
  PoolType,
  PoolStatus,
  getValidatorIndex,
  getPrototypeApplicationId,
  getManagerApplicationId,
  POOL_STRINGS,
  MANAGER_STRINGS
} from "./config"

// interface

export default class Pool {
  public algod : Algodv2;
  public network : Network;
  public poolType : PoolType;
  public managerApplicationId : number;
  public asset1Id : number;
  public asset2Id : number;
  public validatorIndex : number;
  public logicSig : LogicSigAccount;
  public poolStatus : PoolStatus;
  public applicationId : number;
  public address : string;
  public lpAssetId : number;
  public asset1Balance : number;
  public asset2Balance : number;
  
  constructor(
    algod : Algodv2,
    network : Network,
    poolType : PoolType,
    asset1Id : number,
    asset2Id : number
  ) {
    if (asset1Id >= asset2Id) {
      throw new Error("Invalid asset ordering. Assert 1 must be less than Asset 2");
    }
    this.algod = algod
    this.network = network
    this.poolType = poolType
    this.asset1Id = asset1Id
    this.asset2Id = asset2Id
    this.managerApplicationId = getManagerApplicationId(network)
    this.validatorIndex = getValidatorIndex(network, this.poolType)
    this.logicSig = new LogicSigAccount(generateLogicSig(asset1Id, asset2Id, this.managerApplicationId, this.validatorIndex))
  }

  async loadState() : Promise<PoolStatus> {
    // get logic sig state
    let logicSigLocalState = await getApplicationLocalState(this.algod, this.logicSig.address(), this.managerApplicationId)
    
    // pool is uninitialized
    if (Object.keys(logicSigLocalState).length === 0) {
      this.poolStatus = PoolStatus.UNINITIALIZED
      return this.poolStatus
    } else {
      this.poolStatus = PoolStatus.ACTIVE
    }
    
    if (logicSigLocalState[MANAGER_STRINGS.registered_asset_1_id] !== this.asset1Id ||
        logicSigLocalState[MANAGER_STRINGS.registered_asset_2_id] !== this.asset2Id ||
        logicSigLocalState[MANAGER_STRINGS.validator_index] !== this.validatorIndex) {
      throw new Error("Logic sig state does not match expected")
    }
    
    this.applicationId = logicSigLocalState[MANAGER_STRINGS.registered_pool_id]
    this.address = getApplicationAddress(this.applicationId)
    
    // load pool state
    let poolState = getApplicationGlobalState(this.algod, this.applicationId)
    this.asset1Balance = poolState[POOL_STRINGS.balance_1]
    this.asset2Balance = poolState[POOL_STRINGS.balance_2]
    this.lpAssetId = poolState[POOL_STRINGS.lp_id]
    
    return this.poolStatus
  }
  
  async getCreatePoolTxns(sender : string):Promise<Transaction[]> {
    if (this.poolStatus == PoolStatus.ACTIVE) {
      throw new Error("Pool already active cannot generate create pool txn")
    }
    const params = await getParams(this.algod)

    let prototypeApplicationID = getPrototypeApplicationId(this.network, this.poolType)
    let prototypePrograms = await getApplicationPrograms(this.algod, prototypeApplicationID)
  
    const txn0 = algosdk.makeApplicationCreateTxnFromObject({
      from: sender,
      suggestedParams: params,
      approvalProgram: prototypePrograms[0],
      clearProgram: prototypePrograms[1],
      numLocalInts: 0,
      numLocalByteSlices: 0,
      numGlobalInts: 60,
      numGlobalByteSlices: 4,
      onComplete: OnApplicationComplete.NoOpOC,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: undefined,
      rekeyTo: undefined,
    })
    
    return [txn0]
  }
  
  async getInitializePoolTxns(sender : string, poolApplicationID : number):Promise<Transaction[]> {
    if (this.poolStatus == PoolStatus.ACTIVE) {
      throw new Error("Pool already active cannot generate initialize pool txn")
    }
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // fund manager
    const txn0 = getPaymentTxn(params, sender, getApplicationAddress(this.managerApplicationId), 1, 500000)
  
    // fund logic sig
    const txn1 = getPaymentTxn(params, sender, this.logicSig.address(), 1, 835000)
  
    // opt logic sig into manager
    params.fee = 5000
    const txn2 = algosdk.makeApplicationOptInTxnFromObject({
      from: this.logicSig.address(),
      appIndex: this.managerApplicationId,
      suggestedParams: params,
      appArgs: [encodeUint64(this.asset1Id), encodeUint64(this.asset2Id), encodeUint64(this.validatorIndex)],
      accounts: undefined,
      foreignApps: [poolApplicationID],
      foreignAssets: undefined,
      rekeyTo: undefined,
    })
    
    // pool
    params.fee = 1000
    const txn3 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: poolApplicationID,
      appArgs: [enc.encode(POOL_STRINGS.initialize_pool)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: this.asset1Id != 1 ? [this.asset1Id, this.asset2Id] : [this.asset2Id],
      rekeyTo: undefined,
    })
    
    return [txn0, txn1, txn2, txn3]
  }
  
  async getPoolTxns(sender : string,
                    asset1Amount : number,
                    asset2Amount : number,
                    maximumSlippage : number):Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // send asset1
    const txn0 = getPaymentTxn(params, sender, this.address, this.asset1Id, asset1Amount)
  
    // send asset2
    const txn1 = getPaymentTxn(params, sender, this.address, this.asset2Id, asset2Amount)
  
    // pool
    params.fee = 3000
    const txn2 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode(POOL_STRINGS.pool), encodeUint64(maximumSlippage)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.lpAssetId],
      rekeyTo: undefined,
    })

    // redeem asset1 residual
    params.fee = 1000
    const txn3 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode(POOL_STRINGS.redeem_pool_asset1_residual)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset1Id],
      rekeyTo: undefined,
    })
  
    // redeem asset2 residual
    params.fee = 1000
    const txn4 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("rpa2r")],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset2Id],
      rekeyTo: undefined,
    })
  
    return [txn0, txn1, txn2, txn3, txn4]
  }

  async getBurnTxns(sender : string,
                    burnAmount : number):Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // send lp token
    const txn0 = getPaymentTxn(params, sender, this.address, this.lpAssetId, burnAmount)

    // burn asset1 out
    params.fee = 2000
    const txn1 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("ba10")],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset1Id],
      rekeyTo: undefined,
    })
  
    // burn asset2 out
    params.fee = 2000
    const txn2 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("ba20")],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset2Id],
      rekeyTo: undefined,
    })
  
    return [txn0, txn1, txn2]
  }

  async getSwapExactForTxns(sender : string,
                            swapInAsset : number,
                            swapInAmount : number,
                            minAmountToReceive : number):Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // send swap in asset
    const txn0 = getPaymentTxn(params, sender, this.address, swapInAsset, swapInAmount)

    // swap exact for
    params.fee = 2000
    const txn1 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("sef"), encodeUint64(minAmountToReceive)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [swapInAsset == this.asset1Id ? this.asset2Id : this.asset1Id],
      rekeyTo: undefined,
    })
  
    return [txn0, txn1]
  }

  async getSwapForExactTxns(sender : string,
                            swapInAsset : number,
                            swapInAmount : number,
                            amountToReceive : number):Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // send swap in asset
    const txn0 = getPaymentTxn(params, sender, this.address, swapInAsset, swapInAmount)

    // swap for exact
    params.fee = 2000
    const txn1 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("sfe"), encodeUint64(amountToReceive)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [swapInAsset == this.asset1Id ? this.asset2Id : this.asset1Id],
      rekeyTo: undefined,
    })
  
    // redeem unused swap in asset
    params.fee = 2000
    const txn2 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("rsr")],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [swapInAsset],
      rekeyTo: undefined,
    })
  
    return [txn0, txn1, txn2]
  }

}