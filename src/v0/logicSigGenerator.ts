import { encodeUint64 } from "algosdk"
import {
  POOL_FACTORY_LOGIC_SIG_TEMPLATE,
  MANAGER_APP_ID_OFFSET,
  ASSET_1_ID_OFFSET,
  ASSET_2_ID_OFFSET,
  VALIDATOR_ID_OFFSET,
  TEMPLATE_INT_LEN,
} from "./config"

/**
 * Funtion to generate an algofi amm logic sig for a given set of inputs
 *
 * @param   {int}     manager_app_id
 * @param   {int}     asset1_id
 * @param   {int}     asset2_id
 * @param   {int}     validator_index
 *
 * @return  {string} logic sig for provided args
 */
export function generateLogicSig(asset1_id : number,
                                       asset2_id : number,
                                       manager_app_id : number,
                                       validator_index : number): string {
  let template = atob(POOL_FACTORY_LOGIC_SIG_TEMPLATE)
  let decoded_logic_sig =
    template.slice(0, ASSET_1_ID_OFFSET) + encodeUint64(asset1_id)
    template.slice(ASSET_1_ID_OFFSET + TEMPLATE_INT_LEN, ASSET_2_ID_OFFSET) + encodeUint64(asset2_id)
    template.slice(ASSET_2_ID_OFFSET + TEMPLATE_INT_LEN, MANAGER_APP_ID_OFFSET) + encodeUint64(manager_app_id)
    template.slice(MANAGER_APP_ID_OFFSET + TEMPLATE_INT_LEN, VALIDATOR_ID_OFFSET) + encodeUint64(validator_index)
    template.slice(VALIDATOR_ID_OFFSET)
  return btoa(decoded_logic_sig)
}