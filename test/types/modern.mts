import operations, { add, argmax, sum, type NdArrayLike } from '../../index.mjs'
import ndarray from 'ndarray'

const source = ndarray(new Float64Array([1, 2]))
const destination = ndarray(new Float64Array(2))
const structural: NdArrayLike = source
add(destination, source, source)
const total: number = sum(structural)
const index: number[] = argmax(source)

// @ts-expect-error ESM default is the plain operation object
operations.default
// @ts-expect-error exact operation inventory
operations.typo

void total
void index
