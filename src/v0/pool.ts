// external imports
import algosdk, {
  Algodv2,
  LogicSigAccount,
  Transaction,
  getApplicationAddress,
  encodeUint64,
  OnApplicationComplete
} from "algosdk"
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

import {
  getD,
  getY
} from "./stableswapMath"

// interface

const testnetNanoswapPools = {77279127: {77279142: 77282939}} // (asset1Id, asset2Id) -> poolApplicationID
const mainnetNanoswapPools = {
  31566704: {465865291: 658337046},
  312769: {
    465865291: 659677335,
    31566704: 659678644, 
  }
}

export default class Pool {
  public algod: Algodv2
  public network: Network
  public poolType: PoolType
  public managerApplicationId: number
  public asset1Id: number
  public asset2Id: number
  public validatorIndex: number
  public logicSig: LogicSigAccount
  public poolStatus: PoolStatus
  public applicationId: number
  public address: string
  public lpAssetId: number
  public asset1Balance: number
  public asset2Balance: number
  public lpCirculation: number
  public swapFee: number
  private initialAmplificationFactor: number
  private initialAmplificationFactorTime: number
  private futureAmplificationFactor: number
  private futureAmplificationFactorTime: number
  private t: number

  constructor(algod: Algodv2, network: Network, poolType: PoolType, asset1Id: number, asset2Id: number) {
    if (asset1Id >= asset2Id) {
      throw new Error("Invalid asset ordering. Asset 1 must be less than Asset 2")
    }
    this.algod = algod
    this.network = network
    this.poolType = poolType
    this.asset1Id = asset1Id
    this.asset2Id = asset2Id
    this.managerApplicationId = getManagerApplicationId(network, poolType)
    this.swapFee = getSwapFee(this.network, this.poolType)
    this.validatorIndex = getValidatorIndex(network, this.poolType)

    if (poolType != PoolType.NANOSWAP) {
        this.logicSig = new LogicSigAccount(
          generateLogicSig(asset1Id, asset2Id, this.managerApplicationId, this.validatorIndex)
        )
    }
  }

  async loadState(): Promise<PoolStatus> {
    // get logic sig state
    if (this.poolType != PoolType.NANOSWAP) {
        let logicSigLocalState = await getApplicationLocalState(
          this.algod,
          this.logicSig.address(),
          this.managerApplicationId
        )

        // pool is uninitialized
        if (Object.keys(logicSigLocalState).length === 0) {
          this.poolStatus = PoolStatus.UNINITIALIZED
          return this.poolStatus
        } else {
          this.poolStatus = PoolStatus.ACTIVE
        }

        if (
          logicSigLocalState[MANAGER_STRINGS.registered_asset_1_id] !== this.asset1Id ||
          logicSigLocalState[MANAGER_STRINGS.registered_asset_2_id] !== this.asset2Id ||
          logicSigLocalState[MANAGER_STRINGS.validator_index] !== this.validatorIndex
        ) {
          throw new Error("Logic sig state does not match expected")
        }

        this.applicationId = logicSigLocalState[MANAGER_STRINGS.registered_pool_id]
    } else {
        this.poolStatus = PoolStatus.ACTIVE
        if (this.network == Network.MAINNET){
          this.applicationId = mainnetNanoswapPools[this.asset1Id][this.asset2Id]
        } else {
          this.applicationId = testnetNanoswapPools[this.asset1Id][this.asset2Id]
        }
    }

    this.address = getApplicationAddress(this.applicationId)

    // load pool state
    let poolState = await getApplicationGlobalState(this.algod, this.applicationId)
    this.asset1Balance = poolState[POOL_STRINGS.balance_1]
    this.asset2Balance = poolState[POOL_STRINGS.balance_2]
    this.lpAssetId = poolState[POOL_STRINGS.lp_id]
    this.lpCirculation = poolState[POOL_STRINGS.lp_circulation]

    this.initialAmplificationFactor = poolState[POOL_STRINGS.initial_amplification_factor]
    this.futureAmplificationFactor = poolState[POOL_STRINGS.future_amplification_factor]
    this.initialAmplificationFactorTime = poolState[POOL_STRINGS.initial_amplification_factor_time]
    this.futureAmplificationFactorTime = poolState[POOL_STRINGS.future_amplification_factor_time]
    let status = await this.algod.status().do()
    let lastRound = status["last-round"] - 1
    let blockInfo = await this.algod.block(lastRound).do()
    this.t = blockInfo["block"]["ts"]

    return this.poolStatus
  }

  // GETTERS

  async getPoolPrice(assetId: number) {
    if (assetId === this.asset1Id) {
      return this.asset1Balance / this.asset2Balance
    } else if (assetId === this.asset2Id) {
      return this.asset2Balance / this.asset1Balance
    } else {
      throw new Error("Invalid asset id")
    }
  }

  // TXN SIGNER

  async signTxnWithLogicSig(txn: Transaction) {
    return algosdk.signLogicSigTransaction(txn, this.logicSig)
  }

  // TXN GENERATORS

  async getCreatePoolTxn(sender: string): Promise<Transaction> {
    if (this.poolStatus === PoolStatus.ACTIVE) {
      throw new Error("Pool already active cannot generate create pool txn")
    }

    if (this.poolType === PoolType.NANOSWAP) {
      throw new Error("Nanoswap pool cannot generate create pool txn")
    }

    const params = await getParams(this.algod)

    let approval_program = getApprovalProgramByType(this.network, this.poolType)
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
      appArgs: this.network == Network.MAINNET ? [encodeUint64(this.asset1Id), encodeUint64(this.asset2Id), encodeUint64(this.validatorIndex)] : [encodeUint64(this.asset1Id), encodeUint64(this.asset2Id)],
      accounts: undefined,
      foreignApps: [this.managerApplicationId],
      foreignAssets: undefined,
      rekeyTo: undefined
    })

    return txn0
  }

  async getInitializePoolTxns(sender: string, poolApplicationID: number): Promise<Transaction[]> {
    if (this.poolStatus === PoolStatus.ACTIVE) {
      throw new Error("Pool already active cannot generate initialize pool txn")
    }
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // fund manager
    const txn0 = getPaymentTxn(params, sender, getApplicationAddress(this.managerApplicationId), 1, this.network === Network.MAINNET ? 400000 : 500000)

    // fund logic sig
    const txn1 = getPaymentTxn(params, sender, this.logicSig.address(), 1, this.network === Network.MAINNET ? 450000 : 835000)

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
      rekeyTo: undefined
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
      rekeyTo: undefined
    })

    return algosdk.assignGroupID([txn0, txn1, txn2, txn3])
  }

  async getLPTokenOptInTxn(sender: string): Promise<Transaction[]> {
    const params = await getParams(this.algod)
    return [getPaymentTxn(params, sender, sender, this.lpAssetId, 0)]
  }

  async getPoolTxns(
    sender: string,
    asset1Amount: number,
    asset2Amount: number,
    maximumSlippage: number,
    doOptIn: boolean = true,
    assignGroup: boolean = true,
    fee: number = 3000
  ): Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()

    // opt-in asset
    const txn0 = getPaymentTxn(params, sender, sender, this.lpAssetId, 0)

    // send asset1
    const txn1 = getPaymentTxn(params, sender, this.address, this.asset1Id, asset1Amount)

    // send asset2
    const txn2 = getPaymentTxn(params, sender, this.address, this.asset2Id, asset2Amount)

    // pool
    params.fee = fee
    const txn3 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode(POOL_STRINGS.pool), encodeUint64(maximumSlippage)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: [this.managerApplicationId],
      foreignAssets: [this.lpAssetId],
      rekeyTo: undefined
    })
    
    let params2 = await getParams(this.algod)
    // redeem asset1 residual
    params2.fee = 1000
    const txn4 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode(POOL_STRINGS.redeem_pool_asset1_residual)],
      suggestedParams: params2,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset1Id],
      rekeyTo: undefined
    })

    // redeem asset2 residual
    let params3 = await getParams(this.algod)
    params3.fee = 1000
    const txn5 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("rpa2r")],
      suggestedParams: params3,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [this.asset2Id],
      rekeyTo: undefined
    })
    let txns = doOptIn ? [txn0, txn1, txn2, txn3, txn4, txn5] : [txn1, txn2, txn3, txn4, txn5]
    return assignGroup ? algosdk.assignGroupID(txns) : txns
  }

  async getBurnTxns(sender: string, burnAmount: number, assignGroup: boolean = true): Promise<Transaction[]> {
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
      rekeyTo: undefined
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
      rekeyTo: undefined
    })
    let txns = [txn0, txn1, txn2]
    return assignGroup ? algosdk.assignGroupID(txns) : txns
  }

  async getSwapExactForTxns(
    sender: string,
    swapInAsset: number,
    swapInAmount: number,
    minAmountToReceive: number,
    doOptIn: boolean = false,
    assignGroup: boolean = true,
    fee: number = 2000
  ): Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()
    const swapOutAsset = swapInAsset === this.asset1Id ? this.asset2Id : this.asset1Id

    // opt-in asset
    const txn0 = getPaymentTxn(params, sender, sender, swapOutAsset, 0)

    // send swap in asset
    const txn1 = getPaymentTxn(params, sender, this.address, swapInAsset, swapInAmount)

    // swap exact for
    params.fee = fee
    const txn2 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("sef"), encodeUint64(minAmountToReceive)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: [this.managerApplicationId],
      foreignAssets: [swapOutAsset],
      rekeyTo: undefined
    })
    let txns = doOptIn ? [txn0, txn1, txn2] : [txn1, txn2]
    return assignGroup ? algosdk.assignGroupID(txns) : txns
  }

  async getSwapForExactTxns(
    sender: string,
    swapInAsset: number,
    swapInAmount: number,
    amountToReceive: number,
    doOptIn: boolean = false,
    assignGroup: boolean = true,
    fee: number = 2000
  ): Promise<Transaction[]> {
    const params = await getParams(this.algod)
    const enc = new TextEncoder()
    const swapOutAsset = swapInAsset === this.asset1Id ? this.asset2Id : this.asset1Id
    // opt-in asset
    const txn0 = getPaymentTxn(params, sender, sender, swapOutAsset, 0)
    // send swap in asset
    const txn1 = getPaymentTxn(params, sender, this.address, swapInAsset, swapInAmount)

    // swap for exact
    params.fee = fee
    const txn2 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("sfe"), encodeUint64(amountToReceive)],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: [this.managerApplicationId],
      foreignAssets: [swapOutAsset],
      rekeyTo: undefined
    })

    // redeem unused swap in asset
    params.fee = 2000
    const txn3 = algosdk.makeApplicationNoOpTxnFromObject({
      from: sender,
      appIndex: this.applicationId,
      appArgs: [enc.encode("rsr")],
      suggestedParams: params,
      accounts: undefined,
      foreignApps: undefined,
      foreignAssets: [swapInAsset],
      rekeyTo: undefined
    })
    let txns = doOptIn ? [txn0, txn1, txn2, txn3] : [txn1, txn2, txn3]
    return assignGroup ? algosdk.assignGroupID(txns) : txns
  }

  async getZapLPTransactions(
    sender: string,
    zapInAsset: number,
    zapInAmount: number,
    maximumSlippageSwap: number,
    doOptIn: boolean = false,
    doOptInLP: boolean = false,
    assignGroup: boolean = true,
    maximumSlippageLP: number = 10000
  ): Promise<Transaction[]> {
    const balA = zapInAsset === this.asset1Id ? this.asset1Balance : this.asset2Balance
    const swapInAmount = parseInt(String((Math.sqrt(balA * balA + balA * zapInAmount * (1 + this.swapFee)) - balA) * 1))
    const swapInAssetId = zapInAsset === this.asset1Id ? this.asset1Id : this.asset2Id
    const quote = this.getSwapExactForQuote(swapInAssetId, swapInAmount)
    const amountToReceive = zapInAsset === this.asset1Id ? quote.asset2Delta : quote.asset1Delta
    const minAmountToReceive = parseInt(String((1 - maximumSlippageSwap / 100000) * amountToReceive))

    const swapForExactTxns = await this.getSwapExactForTxns(
      sender,
      zapInAsset,
      swapInAmount,
      minAmountToReceive,
      doOptIn,
      false,
      2000 + (quote?.extraComputeFee || 0)
    )

    const asset1Amount = zapInAsset === this.asset1Id ? zapInAmount - swapInAmount : amountToReceive
    const asset2Amount = zapInAsset === this.asset1Id ? amountToReceive : zapInAmount - swapInAmount
    const poolTxns = await this.getPoolTxns(sender, asset1Amount, asset2Amount, maximumSlippageLP, doOptInLP, false)

    let txns = []
    swapForExactTxns.forEach(txn => txns.push(txn))
    poolTxns.forEach(txn => txns.push(txn))

    return assignGroup ? algosdk.assignGroupID(txns) : txns
  }
  
  async getNanoZapTransactions(
    sender: string,
    asset1InputAmount: number,
    asset2InputAmount: number,
    maximumSlippageSwap: number,
    doOptIn: boolean = false,
    doOptInLP: boolean = false,
    assignGroup: boolean = true,
    maximumSlippageLP: number = 10000
  ): Promise<Transaction[]> {
    let tradeQuote: BalanceDelta
    let txns = []
    
    
    if (asset1InputAmount === 0 && asset2InputAmount === 0) {
      return []
    }

    
    if (asset2InputAmount === 0 || asset1InputAmount / asset2InputAmount > this.asset1Balance / this.asset2Balance) {
      let objective = function (dx) {
        let dy =  this.getSwapExactForQuote(this.asset1Id, dx).asset2Delta
        return this.asset1Balance * asset2InputAmount - 
        this.asset2Balance * asset1InputAmount +
        (this.asset1Balance + asset1InputAmount) * dy +
        (this.asset2Balance + asset2InputAmount) * dx
      }.bind(this)
      let tradeAmt = this.binarySearch(0, asset1InputAmount, objective)
      tradeQuote = this.getSwapExactForQuote(this.asset1Id, tradeAmt)
      
      const swapExactForTxns = await this.getSwapExactForTxns(
        sender,
        this.asset1Id,
        -tradeQuote.asset1Delta,
        Math.round(tradeQuote.asset2Delta * (1e6 - maximumSlippageSwap) / 1e6),
        doOptIn,
        false,
        2000 + (tradeQuote?.extraComputeFee || 0))
      swapExactForTxns.forEach(txn => txns.push(txn))
    }
    
    if (asset1InputAmount === 0 || asset1InputAmount / asset2InputAmount < this.asset1Balance / this.asset2Balance) {
      let objective = function (dy) {
        let dx =  this.getSwapExactForQuote(this.asset2Id, dy).asset1Delta
        return this.asset2Balance * asset1InputAmount - 
        this.asset1Balance * asset2InputAmount + 
        (this.asset1Balance + asset1InputAmount) * dy +
        (this.asset2Balance + asset2InputAmount) * dx
        }.bind(this)
      let tradeAmt = this.binarySearch(0, asset2InputAmount, objective)
      tradeQuote = this.getSwapExactForQuote(this.asset2Id, tradeAmt)
      const swapExactForTxns = await this.getSwapExactForTxns(
        sender,
        this.asset2Id,
        -tradeQuote.asset2Delta,
        Math.round(tradeQuote.asset1Delta * (1e6 - maximumSlippageSwap) / 1e6),
        doOptIn,
        false,
        2000 + (tradeQuote?.extraComputeFee || 0))
      swapExactForTxns.forEach(txn => txns.push(txn))
    }
    
    this.asset1Balance -= tradeQuote.asset1Delta
    this.asset2Balance -= tradeQuote.asset2Delta
    
    let whatIfDelta1 = asset1InputAmount + tradeQuote.asset1Delta
    let whatIfDelta2 = asset2InputAmount + tradeQuote.asset2Delta
    let poolQuote = this.getPoolQuote(this.asset1Id, whatIfDelta1, whatIfDelta2)
    let poolTxns = await this.getPoolTxns(sender, whatIfDelta1, whatIfDelta2, maximumSlippageLP, doOptInLP, false, 3000 + (poolQuote?.extraComputeFee || 0))
    poolTxns.forEach(txn => txns.push(txn))
    
    // reset state to what it was
    await this.loadState()
    return assignGroup ? algosdk.assignGroupID(txns) : txns
  }
  
  // QUOTES

  // pool quote
  async getEmptyPoolQuote(asset1PooledAmount: number, asset2PooledAmount: number) {
    let lpsIssued = 0
    let numIter = 0
    if (this.poolType === PoolType.NANOSWAP) {
       [lpsIssued, numIter] = getD([asset1PooledAmount, asset2PooledAmount], this.getAmplificationFactor())
    } else if (asset1PooledAmount * asset2PooledAmount > 2 ** 64 - 1) {
      [lpsIssued, numIter] = [Math.sqrt(asset1PooledAmount) * Math.sqrt(asset2PooledAmount), 0]
    } else {
      [lpsIssued, numIter]  = [Math.sqrt(asset1PooledAmount * asset2PooledAmount), 0]
    }
    return new BalanceDelta(this, -1 * asset1PooledAmount, -1 * asset2PooledAmount, Number(lpsIssued), numIter)
  }

  getPoolQuote(assetId: number, assetAmount: number, whatIfDelta1: number = 0, whatIfDelta2: number = 0) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }

    let asset1PooledAmount = 0
    let asset2PooledAmount = 0
    let lpsIssued = 0
    let numIter = 0

    if (assetId === this.asset1Id) {
      asset1PooledAmount = assetAmount
      asset2PooledAmount = Math.floor(
        (asset1PooledAmount * (this.asset2Balance + whatIfDelta2)) / (this.asset1Balance + whatIfDelta1)
      )
    } else {
      asset2PooledAmount = assetAmount
      asset1PooledAmount = Math.ceil(
        (asset2PooledAmount * (this.asset1Balance + whatIfDelta1)) / (this.asset2Balance + whatIfDelta2)
      )
    }

    if (this.poolType === PoolType.NANOSWAP) {
      let [D0, numIterD0] = getD([this.asset1Balance, this.asset2Balance], this.getAmplificationFactor())
      let [D1, numIterD1] = getD([asset1PooledAmount + this.asset1Balance, asset2PooledAmount + this.asset2Balance], this.getAmplificationFactor())
      lpsIssued = Math.floor(this.lpCirculation * Number((D1 - D0) / D0))
      numIter = numIterD0 + numIterD1
    } else {
      lpsIssued = Math.floor((asset1PooledAmount * this.lpCirculation) / (this.asset1Balance + whatIfDelta1))
    }

    return new BalanceDelta(this, -1 * asset1PooledAmount, -1 * asset2PooledAmount, lpsIssued, numIter)
  }

  // burn quote
  async getBurnQuote(lpAmount: number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }

    if (this.lpCirculation < lpAmount) {
      throw new Error("Error: cannot burn more lp tokens than are in circulation")
    }

    let asset1Amount = Math.floor((lpAmount * this.asset1Balance) / this.lpCirculation)
    let asset2Amount = Math.floor((lpAmount * this.asset2Balance) / this.lpCirculation)

    return new BalanceDelta(this, asset1Amount, asset2Amount, -1 * lpAmount, 0)
  }

  // swap_exact_for quote
  getSwapExactForQuote(swapInAssetId: number, swapInAmount: number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }
    
    if (swapInAmount === 0) {
      return new BalanceDelta(this, 0, 0, 0, 0)
    }

    let swapInAmountLessFees = swapInAmount - (Math.floor(swapInAmount * this.swapFee) + 1)
    let swapOutAmount = 0
    let numIter = 0
    if (swapInAssetId === this.asset1Id) {
       if (this.poolType === PoolType.NANOSWAP) {
         let [D, numIterD] = getD([this.asset1Balance, this.asset2Balance], this.getAmplificationFactor())
         let [y, numIterY] = getY(0, 1, this.asset1Balance + swapInAmountLessFees, [this.asset1Balance, this.asset2Balance], D, this.getAmplificationFactor())
         swapOutAmount = this.asset2Balance - Number(y) - 1
         numIter = numIterD + numIterY
       } else {
         swapOutAmount = Math.floor(
            (this.asset2Balance * swapInAmountLessFees) / (this.asset1Balance + swapInAmountLessFees)
         )
       }
      return new BalanceDelta(this, -1 * swapInAmount, swapOutAmount, 0, numIter)
    } else {
      if (this.poolType === PoolType.NANOSWAP) {
       let [D, numIterD] = getD([this.asset1Balance, this.asset2Balance], this.getAmplificationFactor())
       let [y, numIterY] = getY(1, 0, this.asset2Balance + swapInAmountLessFees, [this.asset1Balance, this.asset2Balance], D, this.getAmplificationFactor())
       swapOutAmount = this.asset1Balance - y - 1
       numIter = numIterD + numIterY
      } else {
        swapOutAmount = Math.floor(
          (this.asset1Balance * swapInAmountLessFees) / (this.asset2Balance + swapInAmountLessFees)
        )
      }
      return new BalanceDelta(this, swapOutAmount, -1 * swapInAmount, 0, numIter)
    }
  }

  // swap_for_exact quote
  getSwapForExactQuote(swapOutAssetId: number, swapOutAmount: number) {
    if (this.lpCirculation === 0) {
      throw new Error("Error: pool is empty")
    }

    let swapInAmountLessFees = 0
    let numIter = 0
    if (swapOutAssetId === this.asset1Id) {
      if (this.poolType === PoolType.NANOSWAP) {
       let [D, numIterD] = getD([this.asset1Balance, this.asset2Balance], this.getAmplificationFactor())
       let [y, numIterY] = getY(1, 0, this.asset1Balance - swapOutAmount, [this.asset1Balance, this.asset2Balance], D, this.getAmplificationFactor())
       swapInAmountLessFees = y - this.asset2Balance + 1
       numIter = numIterD + numIterY
      } else {
        swapInAmountLessFees = Math.floor((this.asset2Balance * swapOutAmount) / (this.asset1Balance - swapOutAmount)) - 1
      }
    } else {
      if (this.poolType === PoolType.NANOSWAP) {
       let [D, numIterD] = getD([this.asset1Balance, this.asset2Balance], this.getAmplificationFactor())
       let [y, numIterY] = getY(0, 1, this.asset2Balance - swapOutAmount, [this.asset1Balance, this.asset2Balance], D, this.getAmplificationFactor())
       swapInAmountLessFees = y - this.asset1Balance + 1
       numIter = numIterD + numIterY
      } else {
        swapInAmountLessFees = Math.floor((this.asset1Balance * swapOutAmount) / (this.asset2Balance - swapOutAmount)) - 1
      }
    }

    let swapInAmount = Math.ceil(swapInAmountLessFees / (1 - this.swapFee))

    if (swapOutAssetId === this.asset1Id) {
      return new BalanceDelta(this, swapOutAmount, -1 * swapInAmount, 0, numIter)
    } else {
      return new BalanceDelta(this, -1 * swapInAmount, swapOutAmount, 0, numIter)
    }
  }

  getAmplificationFactor(): number {
    if (this.t < this.futureAmplificationFactorTime) {
        return Math.floor(this.initialAmplificationFactor +
               (this.futureAmplificationFactor - this.initialAmplificationFactor) * (this.t - this.initialAmplificationFactor)
               / (this.futureAmplificationFactorTime- this.initialAmplificationFactorTime))
    }

    return this.futureAmplificationFactor
  }
  
  binarySearch(lower, upper, objective) {
    if (lower > upper) return lower
    let mid = Math.floor(lower + (upper - lower) / 2)
    let midVal = objective(mid)
    let upperVal = objective(upper)
    let lowerVal = objective(lower)
    
    if (midVal < 0) {
      return this.binarySearch(mid+1, upper, objective)
    } else if (midVal > 0) {
      return this.binarySearch(lower, mid-1, objective)
    } else {
      return mid
    }
  }
  
  async getNanoZapQuote(asset1InputAmount: number, asset2InputAmount: number) {
    if (asset1InputAmount === 0 && asset2InputAmount === 0) {
      return this.getPoolQuote(this.asset1Id, 0,0)
    }
    let tradeQuote: BalanceDelta
    let txns = []
    
    if (asset2InputAmount === 0 || asset1InputAmount / asset2InputAmount > this.asset1Balance / this.asset2Balance) {
      let objective = function (dx) {
        let dy =  this.getSwapExactForQuote(this.asset1Id, dx).asset2Delta
        return this.asset1Balance * asset2InputAmount - 
        this.asset2Balance * asset1InputAmount +
        (this.asset1Balance + asset1InputAmount) * dy +
        (this.asset2Balance + asset2InputAmount) * dx
      }.bind(this)
      let tradeAmt = this.binarySearch(0, asset1InputAmount, objective)
      tradeQuote = this.getSwapExactForQuote(this.asset1Id, tradeAmt)
    }
    if (asset1InputAmount === 0 || asset1InputAmount / asset2InputAmount < this.asset1Balance / this.asset2Balance) {
      let objective = function (dy) {
        let dx =  this.getSwapExactForQuote(this.asset2Id, dy).asset1Delta
        return this.asset2Balance * asset1InputAmount - 
        this.asset1Balance * asset2InputAmount + 
        (this.asset1Balance + asset1InputAmount) * dy +
        (this.asset2Balance + asset2InputAmount) * dx
        }.bind(this)
      let tradeAmt = this.binarySearch(0, asset2InputAmount, objective)
      tradeQuote = this.getSwapExactForQuote(this.asset2Id, tradeAmt)
    }
    
    this.asset1Balance -= tradeQuote.asset1Delta
    this.asset2Balance -= tradeQuote.asset2Delta
    
    let whatIfDelta1 = asset1InputAmount + tradeQuote.asset1Delta
    let whatIfDelta2 = asset2InputAmount + tradeQuote.asset2Delta
    let poolQuote = this.getPoolQuote(this.asset1Id, whatIfDelta1, whatIfDelta2)
    // reset state to what it's supposed to be
    await this.loadState()
    return poolQuote
  }
}
