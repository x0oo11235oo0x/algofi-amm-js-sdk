import {
  MAINNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT,
  MAINNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT,
  TESTNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT,
  TESTNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT,
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
  CONSTANT_PRODUCT_LOW_FEE = 0,
  CONSTANT_PRODUCT_HIGH_FEE = 1,
  NANOSWAP = 2
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
  if (poolType === PoolType.CONSTANT_PRODUCT_LOW_FEE) {
    return 0
  } else if (poolType === PoolType.CONSTANT_PRODUCT_HIGH_FEE) {
    return 1
  } else {
    return -1
  }
}

export function getApprovalProgramByType(network: Network, poolType : PoolType) : Uint8Array {
  if (network === Network.MAINNET) {
    if (poolType === PoolType.CONSTANT_PRODUCT_LOW_FEE) {
      return MAINNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT
    } else {
      return MAINNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT
    }
  } else {
    if (poolType === PoolType.CONSTANT_PRODUCT_LOW_FEE) {
      return TESTNET_APPROVAL_PROGRAM_LOW_FEE_CONSTANT_PRODUCT
    } else {
      return TESTNET_APPROVAL_PROGRAM_HIGH_FEE_CONSTANT_PRODUCT
    }
  }
}

export function getClearStateProgram() : Uint8Array {
  return CLEAR_STATE_PROGRAM
}

export function getManagerApplicationId(network : Network) : number {
  const managerApplicationIds: EnumDictionary<Network, number> = {
    [Network.MAINNET] : 605753404,
    [Network.TESTNET] : 66008735
  }
  return managerApplicationIds[network]
}

export function getSwapFee(network : Network, poolType : PoolType) : number {
  if (network === Network.MAINNET) {
    if (poolType === PoolType.CONSTANT_PRODUCT_LOW_FEE) {
      return 0.0025
    } else if ((poolType === PoolType.CONSTANT_PRODUCT_HIGH_FEE)) {
      return 0.0075
    } else {
        return 0.0001 // NANOSWAP
    }
  } else {
    if (poolType === PoolType.CONSTANT_PRODUCT_LOW_FEE) {
      return 0.003
    } else {
      return 0.01
    }
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
    initial_amplification_factor : "iaf",
    future_amplification_factor : "faf",
    initial_amplification_factor_time : "iat",
    future_amplification_factor_time : "fat",
    
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
