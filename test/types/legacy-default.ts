import operations from '../..'
import ndarray = require('ndarray')

const array = ndarray(new Float64Array([1, 2]))
operations.sum(array)
// @ts-expect-error the default value is the plain object, not a namespace wrapper
operations.default
