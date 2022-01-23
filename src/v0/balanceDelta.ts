// interface

export default class BalanceDelta {
  public asset1_delta : number;
  public asset2_delta : number;
  public lp_delta : number;
  
  constructor(
    asset1_delta : number,
    asset2_delta : number,
    lp_delta : number
  ) {
    this.asset1_delta = asset1_delta
    this.asset2_delta = asset2_delta
    this.lp_delta = lp_delta
  }
}