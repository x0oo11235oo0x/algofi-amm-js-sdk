// MANAGER APPLICATION ID
export const MAINNET_MANAGER_APPLICATION_ID = 12345678
export const TESTNET_MANAGER_APPLICATION_ID = 12345678

// prototype pools to copy approval program from for create transaction
export const MAINNET_PROTOTYPE_30BP_CONSTANT_PRODUCT_APPLICATION_ID = 87654321
export const MAINNET_PROTOTYPE_100BP_CONSTANT_PRODUCT_APPLICATION_ID = 7654321

export const TESTNET_PROTOTYPE_30BP_CONSTANT_PRODUCT_APPLICATION_ID = 87654321
export const TESTNET_PROTOTYPE_100BP_CONSTANT_PRODUCT_APPLICATION_ID = 7654321

// stable swap pool applicaton ids
export const MAINNET_STBL_ASSET_ID = 3
export const MAINNET_USDC_ASSET_ID = 2
export const MAINNET_USDT_ASSET_ID = 1
export const MAINNET_STABLE_SWAP_POOL_APPLICATION_IDS = {
    MAINNET_USDC_ASSET_ID : { MAINNET_STBL_ASSET_ID : 12345 }
}

export const TESTNET_STBL_ASSET_ID = 3
export const TESTNET_USDC_ASSET_ID = 2
export const TESTNET_USDT_ASSET_ID = 1
export const TESTNET_STABLE_SWAP_POOL_APPLICATION_IDS = {
    TESTNET_USDC_ASSET_ID : { TESTNET_STBL_ASSET_ID : 12345 }
}


// contract strings
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
