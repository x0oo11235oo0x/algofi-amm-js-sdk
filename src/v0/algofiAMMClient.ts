// imports
import algosdk, { Algodv2 } from "algosdk"
import Pool, { PoolType, PoolStatus } from "./pool"

// enums

export enum Network {
  MAINNET = 0,
  TESTNET = 1
}

// interface

export default class AlgofiAMMClient {
  public network : Network;
  public algod : Algodv2
  
  constructor(
    algod : Algodv2,
    network : Network,
  ) {
    this.algod = algod
    this.network = network
  }
  
  async getPool(poolType : PoolType,
                assetA : number,
                assetB : number) {
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
  
}