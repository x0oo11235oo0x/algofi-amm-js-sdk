// external imports
import algosdk, { Algodv2, LogicSigAccount, Transaction, getApplicationAddress, encodeUint64, OnApplicationComplete } from "algosdk"

// internal imports
import {
  Network,
  PoolType,
  PoolStatus,
  ALGO_ASSET_ID,
  getUSDCAssetId,
  getSTBLAssetId
} from "./config"
import Pool from "./pool"
import AlgofiAMMClient from "./algofiAMMClient"

const ALGO_DECIMALS = 6
const USDC_DECIMALS = 6
const STBL_DECIMALS = 6

// interface

export default class Asset {
  private ammClient : AlgofiAMMClient;
  public assetId : number;
  public name : string;
  public decimals : number;
  public price : number;
  
  constructor(
    ammClient : AlgofiAMMClient,
    assetId : number
  ) {
    this.ammClient = ammClient
    this.assetId = assetId
  }
  
  async loadState() {
    let assetInfo = await this.ammClient.algod.getAssetByID(this.assetId).do()
    this.name  = assetInfo.params.name
    this.decimals = assetInfo.params.decimals
  }

  async refreshPrice() {
    let USDCAssetId = getUSDCAssetId(this.ammClient.network)
    let STBLAssetId = getSTBLAssetId(this.ammClient.network)
    
    let USDCPool = await this.ammClient.getPool(PoolType.CONSTANT_PRODUCT_30BP_FEE, this.assetId, USDCAssetId)
    if (USDCPool.poolStatus === PoolStatus.ACTIVE) {
      this.price = (await USDCPool.getPoolPrice(this.assetId)) * (10**(this.decimals - USDC_DECIMALS))
      return
    }
    
    let STBLPool = await this.ammClient.getPool(PoolType.CONSTANT_PRODUCT_30BP_FEE, this.assetId, STBLAssetId)
    if (STBLPool.poolStatus === PoolStatus.ACTIVE) {
      this.price = (await STBLPool.getPoolPrice(this.assetId)) * (10**(this.decimals - STBL_DECIMALS))
      return
    }
    
    let ALGOPool = await this.ammClient.getPool(PoolType.CONSTANT_PRODUCT_30BP_FEE, this.assetId, ALGO_ASSET_ID)
    if (ALGOPool.poolStatus === PoolStatus.ACTIVE) {
      let priceInAlgo = (await ALGOPool.getPoolPrice(this.assetId)) * (10**(this.decimals - ALGO_DECIMALS))
      
      let USDCALGOPool = await this.ammClient.getPool(PoolType.CONSTANT_PRODUCT_30BP_FEE, USDCAssetId, ALGO_ASSET_ID)
      if(USDCALGOPool.poolStatus === PoolStatus.ACTIVE) {
        this.price = priceInAlgo * (await USDCALGOPool.getPoolPrice(ALGO_ASSET_ID))
      }
    }
    
    // unable to find price
    this.price = 0
  }

}