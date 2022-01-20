// pool factory logic sig template and indexes
const POOL_FACTORY_LOGIC_SIG_TEMPLATE_1 = new Uint8Array([5, 32, 3])
const POOL_FACTORY_LOGIC_SIG_TEMPLATE_2 = new Uint8Array([1, 34, 35, 12, 68, 49, 16, 129, 6, 18, 68, 49, 25, 36, 18, 68, 49, 24, 129])
const POOL_FACTORY_LOGIC_SIG_TEMPLATE_3 = new Uint8Array([18, 68, 54, 26, 0, 23, 34, 18, 68, 54, 26, 1, 23, 35, 18, 68, 54, 26, 2, 23, 129])
const POOL_FACTORY_LOGIC_SIG_TEMPLATE_4 = new Uint8Array([18, 68, 49, 32, 50, 3, 18, 68, 36, 67])

/**
 * Function to concatinate uint8arrays
 * 
 * @param   {Uint8Array[]}  arrays
 * 
 * @returns {Uint8Array}
 */
function concatArrays(arrays : Uint8Array[]) {
  // sum of individual array lengths
  let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);

  if (!arrays.length) return null;

  let result = new Uint8Array(totalLength);

  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0;
  for(let array of arrays) {
    result.set(array, length);
    length += array.length;
  }

  return result;
}

/**
 * Function to generate approval program bytes from integer
 * 
 * @param   {int} value
 * 
 * @return  {Uint8Array} bytes to use in approval program
 */
function encodeInt(value : number): Uint8Array {
  let result = new Uint8Array(8)
  let idx = 0
  while (true) {
    let next_byte = value & 127
    value >>= 7
    if (value) {
      result.set([next_byte | 128], idx)
    } else {
      result.set([next_byte], idx)
      break
    }
    idx += 1
  }
  return result.slice(0, idx+1)  
}

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
                                 validator_index : number): Uint8Array {

  let arrays:Uint8Array[] = [
    POOL_FACTORY_LOGIC_SIG_TEMPLATE_1,
    encodeInt(asset1_id),
    encodeInt(asset2_id),
    POOL_FACTORY_LOGIC_SIG_TEMPLATE_2,
    encodeInt(manager_app_id),
    POOL_FACTORY_LOGIC_SIG_TEMPLATE_3,
    encodeInt(validator_index),
    POOL_FACTORY_LOGIC_SIG_TEMPLATE_4,
  ]
  return concatArrays(arrays)
}