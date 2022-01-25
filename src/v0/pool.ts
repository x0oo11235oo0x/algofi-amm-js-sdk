// external imports
import algosdk, { Algodv2, LogicSigAccount, Transaction, getApplicationAddress, encodeUint64, OnApplicationComplete } from "algosdk"

// internal imports
import { getApplicationGlobalState, getApplicationLocalState, getAccountBalances } from "./stateUtilities"
import { getParams, getPaymentTxn } from "./transactionUtilities"
import { generateLogicSig } from "./logicSigGenerator"
import BalanceDelta from "./balanceDelta"
import {
  Network,
  PoolType,
  PoolStatus,
  getValidatorIndex,
  getApprovalProgramByType,
  getClearStateProgram,
  getManagerApplicationId,
  getSwapFee,
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
  public lpCirculation : number;
  public swapFee : number;
  
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
    this.swapFee = getSwapFee(this.poolType)
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
    let poolState = await getApplicationGlobalState(this.algod, this.applicationId)
    this.asset1Balance = poolState[POOL_STRINGS.balance_1]
    this.asset2Balance = poolState[POOL_STRINGS.balance_2]
    this.lpAssetId = poolState[POOL_STRINGS.lp_id]
    this.lpCirculation = poolState[POOL_STRINGS.lp_circulation]
    
    return this.poolStatus
  }

  // GETTERS
  
  async getPoolPrice(assetId : number) {
    if (assetId === this.asset1Id) {
      return this.asset1Balance / this.asset2Balance
    } else if (assetId === this.asset2Id) {
      return this.asset2Balance / this.asset1Balance
    } else {
      throw new Error("Invalid asset id")
    }
  } 

  // TXN SIGNER
  
  async signTxnWithLogicSig(txn : Transaction) {
    return algosdk.signLogicSigTransaction(txn, this.logicSig)
  }
  
  // TXN GENERATORS

  async getCreatePoolTxn(sender : string):Promise<Transaction> {
    if (this.poolStatus === PoolStatus.ACTIVE) {
      throw new Error("Pool already active cannot generate create pool txn")
    }
    const params = await getParams(this.algod)

    let approval_program = getApprovalProgramByType(this.poolType)
    let clear_state_program = await getClearStateProgram()
  
    const txn0 = algosdk.makeApplicationCreateTxnFromObject({
      from: sender,
      suggestedParams: params,
      approvalProgram: approval_program,
      clearProgram: clear_state_program,
      numLocalInts: 0,
      numLocalByteSlices: 0,
      numGlobalInts: 60,
      numGlobalByteSlices: 4,
      extraPages: 3,
      onComplete: OnApplicationComplete.NoOpOC,
      appArgs: [encodeUint64(this.asset1Id), encodeUint64(this.asset2Id)],
      accounts: undefined,
      foreignApps: [this.managerApplicationId],
      foreignAssets: undefined,
      rekeyTo: undefined,
    })
    
    return txn0
  }
  
  async getInitializePoolTxns(sender : string, poolApplicationID : number):Promise<Transaction[]> {
    if (this.poolStatus === PoolStatus.ACTIVE) {
      throw new Error("Pool already active cannot generate initialize pool txn")
    }
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // fund manager
    const txn0 = getPaymentTxn(params, sender, getApplicationAddress(this.managerApplicationId), 1, 500000)
  
    // fund logic sig
    const txn1 = getPaymentTxn(params, sender, this.logicSig.address(), 1, 835000)
  
    // opt logic sig into manager
    params.fee = 2000
    const txn2 = algosdk.makeApplicationOptInTxnFromObject({
      from: this.logicSig.address(),
      appIndex: this.managerApplicationId,
      suggestedParams: params,
      appArgs: [encodeUint64(this.asset1Id), encodeUint64(this.asset2Id), encodeUint64(this.validatorIndex)],
      accounts: [getApplicationAddress(poolApplicationID)],
      foreignApps: [poolApplicationID],
      foreignAssets: undefined,
      rekeyTo: undefined,
    })
    
    // pool
    params.fee = 4000
    const txn3 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: poolApplicationID,
      appArgs: [enc.encode(POOL_STRINGS.initialize_pool)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: [this.managerApplicationId],
      foreignAssets: this.asset1Id === 1 ? [this.asset2Id] : [this.asset1Id, this.asset2Id],
      rekeyTo: undefined,
    })
    
    return algosdk.assignGroupID([txn0, txn1, txn2, txn3])
  }

  async getLPTokenOptInTxn(sender : string):Promise<Transaction[]> {
    const params = await getParams(this.algod)
    return [getPaymentTxn(params, sender, sender, this.lpAssetId, 0)]
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
  
    return algosdk.assignGroupID([txn0, txn1, txn2, txn3, txn4])
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
      appArgs: [enc.encode("ba1o")],
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
      appArgs: [enc.encode("ba2o")],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset2Id],
      rekeyTo: undefined,
    })
  
    return algosdk.assignGroupID([txn0, txn1, txn2])
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
      foreignApps: [this.managerApplicationId],
      foreignAssets: [swapInAsset === this.asset1Id ? this.asset2Id : this.asset1Id],
      rekeyTo: undefined,
    })
  
    return algosdk.assignGroupID([txn0, txn1])
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
      foreignApps: [this.managerApplicationId],
      foreignAssets: [swapInAsset === this.asset1Id ? this.asset2Id : this.asset1Id],
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
  
    return algosdk.assignGroupID([txn0, txn1, txn2])
  }

  // QUOTES

  // pool quote
  async getEmptyPoolQuote(asset1PooledAmount : number,
                          asset2PooledAmount : number) {
    let lpsIssued = 0
    if (asset1PooledAmount * asset2PooledAmount > 2**64 - 1) {
      lpsIssued = Math.sqrt(asset1PooledAmount) * Math.sqrt(asset2PooledAmount)
    } else {
      lpsIssued = Math.sqrt(asset1PooledAmount * asset2PooledAmount)
    }
    return new BalanceDelta(this, -1 * asset1PooledAmount, -1 * asset2PooledAmount, lpsIssued)
  }
  
  getPoolQuote(assetId : number,
                     assetAmount : number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }
    
    let asset1PooledAmount = 0
    let asset2PooledAmount = 0
    
    if (assetId === this.asset1Id) {
      asset1PooledAmount = assetAmount
      asset2PooledAmount = Math.floor(asset1PooledAmount * this.asset2Balance / this.asset1Balance)
    } else {
      asset2PooledAmount = assetAmount
      asset1PooledAmount = Math.ceil(asset2PooledAmount * this.asset1Balance / this.asset2Balance)
    }
    let lpsIssued = Math.floor(asset1PooledAmount * this.lpCirculation / this.asset1Balance)
    
    return new BalanceDelta(this, -1 * asset1PooledAmount, -1 * asset2PooledAmount, lpsIssued)
  }

  // burn quote
  async getBurnQuote(lpAmount : number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }
    
    if (this.lpCirculation < lpAmount) {
      throw new Error("Error: cannot burn more lp tokens than are in circulation")
    }
    
    let asset1Amount = Math.floor(lpAmount * this.asset1Balance / this.lpCirculation)
    let asset2Amount = Math.floor(lpAmount * this.asset2Balance / this.lpCirculation)

    return new BalanceDelta(this, asset1Amount, asset2Amount, -1 * lpAmount)
  }
  
  // swap_exact_for quote
  getSwapExactForQuote(swapInAssetId : number,
                             swapInAmount : number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }
    
    let swapInAmountLessFees = swapInAmount - Math.ceil(swapInAmount * this.swapFee)
  
    if (swapInAssetId === this.asset1Id) {
      let swapOutAmount = Math.floor((this.asset2Balance * swapInAmountLessFees) / (this.asset1Balance + swapInAmountLessFees))
      return new BalanceDelta(this, -1 * swapInAmount, swapOutAmount, 0)
    } else {
      let swapOutAmount = Math.floor((this.asset1Balance * swapInAmountLessFees) / (this.asset2Balance + swapInAmountLessFees))
      return new BalanceDelta(this, swapOutAmount, -1 * swapInAmount, 0)
    }
  }
  
  // swap_for_exact quote
  getSwapForExactQuote(swapOutAssetId : number,
                             swapOutAmount : number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }

    let swapInAmountLessFees = 0
    if (swapOutAssetId === this.asset1Id) {
      swapInAmountLessFees = Math.floor((this.asset2Balance * swapOutAmount) / (this.asset1Balance - swapOutAmount)) - 1
    } else {
      swapInAmountLessFees = Math.floor((this.asset1Balance * swapOutAmount) / (this.asset2Balance - swapOutAmount)) - 1
    }

    let swapInAmount = Math.ceil(swapInAmountLessFees / (1 - this.swapFee))

    if (swapOutAssetId === this.asset1Id) {
      return new BalanceDelta(this, swapOutAmount, -1 * swapInAmount, 0)
    } else {
      return new BalanceDelta(this, -1 * swapInAmount, swapOutAmount, 0)
    }
  }

}
