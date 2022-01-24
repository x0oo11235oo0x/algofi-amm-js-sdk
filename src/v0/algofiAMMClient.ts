// imports
import algosdk, { Algodv2 } from "algosdk"
import {
  Network,
  PoolType,
  PoolStatus
} from "./config"
import Pool from "./pool"
import Asset from "./asset"

// interface

export default class AlgofiAMMClient {
  public algod : Algodv2
  public network : Network;
  
  constructor(
    algod : Algodv2,
    network : Network,
  ) {
    this.algod = algod
    this.network = network
  }
  
  async getPool(poolType : PoolType,
                assetA : number,
                assetB : number) : Promise<Pool> {
    if (assetA == assetB) {
      throw new Error("Invalid assets. must be different")
    }
    
    if (assetA < assetB) {
      let pool = new Pool(this.algod, this.network, poolType, assetA, assetB)
      await pool.loadState()
      return pool
    } else {
      let pool = new Pool(this.algod, this.network, poolType, assetB, assetA)
      await pool.loadState()
      return pool
    }
  }
  
  async getAsset(assetId : number) {
    let asset = new Asset(this, assetId)
    await asset.loadState()
    return asset
  }
}