import operations = require('../..')
import ndarray = require('ndarray')

const source = ndarray(new Float64Array([1, 2]))
const destination = ndarray(new Float64Array(2))
operations.assign(destination, source)
operations.norm2(source)
// @ts-expect-error no nested default on require
operations.default
// @ts-expect-error exact operation inventory
operations.unknownOperation
