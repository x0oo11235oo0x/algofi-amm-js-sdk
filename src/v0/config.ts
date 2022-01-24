import {
  APPROVAL_PROGRAM_30BP_CONSTANT_PRODUCT,
  APPROVAL_PROGRAM_100BP_CONSTANT_PRODUCT,
  CLEAR_STATE_PROGRAM
} from "./approvalPrograms"

// CONSTANTS

export const ALGO_ASSET_ID = 1;

// ENUMS

export enum Network {
  MAINNET = 0,
  TESTNET = 1
}

export enum PoolType {
  CONSTANT_PRODUCT_30BP_FEE = 0,
  CONSTANT_PRODUCT_100BP_FEE = 1,
}

export enum PoolStatus {
  UNINITIALIZED = 0,
  ACTIVE = 1
}

// LOOKUP FUNCTIONS

type EnumDictionary<T extends string | symbol | number, U> = {
    [K in T]: U;
};

export function getValidatorIndex(network : Network, poolType : PoolType) : number {
  //const validatorIndexes: EnumDictionary<Network, EnumDictionary<PoolType, number>> = {
  //  [Network.MAINNET] : {
  //    [PoolType.CONSTANT_PRODUCT_30BP_FEE] : 0,
  //    [PoolType.CONSTANT_PRODUCT_100BP_FEE] : 1
  //  },
  //  [Network.TESTNET] : {
  //    [PoolType.CONSTANT_PRODUCT_30BP_FEE] : 0,
  //    [PoolType.CONSTANT_PRODUCT_100BP_FEE] : 1
  //  }
  //}
  //return validatorIndexes[network][poolType]
  if (poolType === PoolType.CONSTANT_PRODUCT_30BP_FEE) {
    return 0
  } else {
    return 1
  }
}

export function getApprovalProgramByType(poolType : PoolType) : Uint8Array {
  if (poolType === PoolType.CONSTANT_PRODUCT_30BP_FEE) {
    return APPROVAL_PROGRAM_30BP_CONSTANT_PRODUCT
  } else {
    return APPROVAL_PROGRAM_100BP_CONSTANT_PRODUCT
  }
}

export function getClearStateProgram() : Uint8Array {
  return CLEAR_STATE_PROGRAM
}

export function getManagerApplicationId(network : Network) : number {
  const managerApplicationIds: EnumDictionary<Network, number> = {
    [Network.MAINNET] : 12345678,
    [Network.TESTNET] : 66008735
  }
  return managerApplicationIds[network]
}

export function getSwapFee(poolType : PoolType) : number {
  if (poolType === PoolType.CONSTANT_PRODUCT_30BP_FEE) {
    return 0.003
  } else {
    return 0.01
  }
}

export function getUSDCAssetId(network : Network) : number {
  if (network === Network.MAINNET) {
    return 31566704
  } else {
    return 51435943
  }
}

export function getSTBLAssetId(network : Network) : number {
  if (network === Network.MAINNET) {
    return 465865291
  } else {
    return 51437163
  }
}

// STRING CONSTANTS
export const MANAGER_STRINGS = {
    flash_loan_fee : "flf",
    max_flash_loan_ratio : "mflr",
    registered_asset_1_id : "a1",
    registered_asset_2_id : "a2",
    registered_pool_id : "p",
    reserve_factor : "rf",
    validator_index : "vi"
}
export const POOL_STRINGS = {
    // STATE
    asset1_id : "a1",
    asset_1_to_asset_2_exchange : "e",
    asset2_id : "a2",
    balance_1 : "b1",
    balance_2 : "b2",
    cumsum_fees_asset1 : "cf1",
    cumsum_fees_asset2 : "cf2",
    cumsum_time_weighted_asset1_to_asset2_price : "ct12",
    cumsum_time_weighted_asset2_to_asset1_price : "ct21",
    cumsum_volume_asset1 : "cv1",
    cumsum_volume_asset2 : "cv2",
    cumsum_volume_weighted_asset1_to_asset2_price : "cv12",
    cumsum_volume_weighted_asset2_to_asset1_price : "cv21",
    flash_loan_fee : "flf",
    latest_time : "lt",
    lp_circulation : "lc",
    lp_id : "l",
    max_flash_loan_ratio : "mflr",
    reserve_factor : "rf",
    initialized : "i",
    amplification_factor : "af",
    
    // APPLICATION CALLS
    
    burn_asset1_out : "ba1o",
    burn_asset2_out : "ba2o",
    flash_loan : "fl",
    pool : "p",
    redeem_pool_asset1_residual : "rpa1r",
    redeem_pool_asset2_residual : "rpa2r",
    redeem_swap_residual : "rsr",
    swap_exact_for : "sef",
    swap_for_exact : "sfe",
    initialize_pool : "ip",
}
