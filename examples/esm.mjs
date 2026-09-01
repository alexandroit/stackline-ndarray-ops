import { mulseq, sum } from '../index.mjs'

const view = {
  data: new Float64Array([1, 2, 3]),
  shape: [3],
  stride: [1],
  offset: 0,
  dtype: 'float64',
  order: [0]
}

mulseq(view, 2)
console.log(sum(view))
