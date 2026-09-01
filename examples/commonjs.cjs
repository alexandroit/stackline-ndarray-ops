'use strict'

const ops = require('../ndarray-ops.js')

const view = {
  data: new Float64Array([1, 2, 3]),
  shape: [3],
  stride: [1],
  offset: 0,
  dtype: 'float64',
  order: [0]
}

ops.mulseq(view, 2)
console.log(ops.sum(view))
