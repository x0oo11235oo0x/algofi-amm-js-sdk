// imports
import Pool from "./pool"

// interface

export default class BalanceDelta {
  public asset1Delta : number;
  public asset2Delta : number;
  public lpDelta : number;
  public priceDelta : number;
  public extraComputeFee : number;
  
  constructor(
    pool : Pool,
    asset1Delta : number,
    asset2Delta : number,
    lpDelta : number,
    numIter : number,
  ) {
    this.asset1Delta = asset1Delta
    this.asset2Delta = asset2Delta
    this.lpDelta = lpDelta
    this.extraComputeFee = Math.ceil(numIter / (700 / 400)) * 1000

    // calculate price delta
    if (lpDelta === 0) {
      this.priceDelta = 0
    } else if (pool.lpCirculation === 0) {
      this.priceDelta = 0
    } else {
      let startingPriceRatio = pool.asset1Balance / pool.asset2Balance
      let finalPriceRatio = (pool.asset1Balance + asset1Delta) / (pool.asset2Balance + asset2Delta)
      this.priceDelta = Math.abs((startingPriceRatio / finalPriceRatio) - 1)
    }
  }
}