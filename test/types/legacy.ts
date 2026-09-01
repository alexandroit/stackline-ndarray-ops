import ops = require('../..')
import ndarray = require('ndarray')

const typed = ndarray(new Float64Array([1, 2, 3]))
const destination = ndarray(new Float64Array(3))
const returned = ops.add(destination, typed, typed)
const total: number = ops.sum(typed)
const index: number[] = ops.argmin(typed)
const sameDestination: typeof destination = returned

const genericData = {
  length: 1,
  get(_index: number): number { return 1 },
  set(_index: number, _value: number): void {}
}
const generic = ndarray(genericData)
ops.sum(generic)

// @ts-expect-error the CJS operation object has no nested default
ops.default
// @ts-expect-error unknown operations are rejected
ops.typo

void total
void index
void sameDestination
