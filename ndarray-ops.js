/*!
 * @stackline/ndarray-ops 1.0.0
 * Derived from ndarray-ops 1.2.2, Copyright (c) 2013 Mikola Lysenko, MIT.
 */
(function (root, factory) {
  'use strict'
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory()
  } else if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else {
    root.ndarrayOps = factory()
  }
})(typeof globalThis === 'object' ? globalThis : typeof self === 'object' ? self : this, function () {
  'use strict'

  var BLOCK_SIZE = 64
  var INT32_MAX = 2147483647
  var INT32_MIN = -2147483648
  var operations = {}
  var hasOwn = Object.prototype.hasOwnProperty

  function setName(fn, name) {
    try {
      Object.defineProperty(fn, 'name', { configurable: true, value: name })
    } catch (_) {
      // Function names are diagnostic only on engines where name is immutable.
    }
    return fn
  }

  function unaryFunction(name, implementation, generated) {
    return setName(function (array) {
      return implementation(array)
    }, name + (generated ? '_ndarrayops' : '_cwise_thunk'))
  }

  function binaryFunction(name, implementation, generated) {
    return setName(function (array, value) {
      return implementation(array, value)
    }, name + (generated ? '_ndarrayops' : '_cwise_thunk'))
  }

  function ternaryFunction(name, implementation) {
    return setName(function (array, left, right) {
      return implementation(array, left, right)
    }, name + '_ndarrayops')
  }

  function ensureShapeCarrier(array) {
    if (!array || !Array.isArray(array.shape)) {
      throw new TypeError('ndarray-ops: Expected an ndarray-compatible view')
    }
  }

  function ensureArrayView(array) {
    ensureShapeCarrier(array)
    if (!Array.isArray(array.stride)) {
      throw new TypeError('ndarray-ops: Expected an ndarray-compatible view')
    }
    if (array.shape.length !== array.stride.length) {
      throw new TypeError('ndarray-ops: Shape and stride dimensionality must match')
    }
    if (array.data === null || array.data === undefined) {
      throw new TypeError('ndarray-ops: Expected ndarray data storage')
    }
    if (typeof array.dtype !== 'string') {
      throw new TypeError('ndarray-ops: Expected a string ndarray dtype')
    }
    if (!array.order || array.order.length !== array.shape.length) {
      throw new TypeError('ndarray-ops: Order must contain each dimension exactly once')
    }
    var seen = new Array(array.shape.length)
    for (var i = 0; i < array.shape.length; ++i) {
      if (!Number.isSafeInteger(array.shape[i]) || array.shape[i] < 0 || array.shape[i] > INT32_MAX) {
        throw new RangeError('ndarray-ops: Shape extents must be non-negative signed 32-bit integers')
      }
      if (!Number.isSafeInteger(array.stride[i]) || array.stride[i] < INT32_MIN || array.stride[i] > INT32_MAX) {
        throw new RangeError('ndarray-ops: Strides must be signed 32-bit integers')
      }
      var dimension = array.order[i]
      if (!Number.isSafeInteger(dimension) || dimension < 0 || dimension >= array.shape.length || seen[dimension]) {
        throw new TypeError('ndarray-ops: Order must contain each dimension exactly once')
      }
      seen[dimension] = true
    }
    if (array.offset !== undefined && (!Number.isSafeInteger(array.offset) || array.offset < INT32_MIN || array.offset > INT32_MAX)) {
      throw new RangeError('ndarray-ops: Offset must be a signed 32-bit integer')
    }
    if (array.dtype === 'generic' && (typeof array.data.get !== 'function' || typeof array.data.set !== 'function')) {
      throw new TypeError('ndarray-ops: Generic storage must implement get and set')
    }
  }

  function checkShapes(arrays) {
    var first = arrays[0]
    ensureShapeCarrier(first)
    for (var i = 1; i < arrays.length; ++i) {
      var current = arrays[i]
      ensureShapeCarrier(current)
      if (first.shape.length !== current.shape.length) {
        throw new Error('cwise: Arrays do not all have the same dimensionality!')
      }
    }
    for (var dimension = first.shape.length - 1; dimension >= 0; --dimension) {
      for (var j = 1; j < arrays.length; ++j) {
        if (first.shape[dimension] !== arrays[j].shape[dimension]) {
          throw new Error('cwise: Arrays do not all have the same shape!')
        }
      }
    }
    for (var k = 0; k < arrays.length; ++k) ensureArrayView(arrays[k])
  }

  function arrayOrder(array) {
    var order = array.order
    // cwise includes dtype and order in its specialization key. Touch both in
    // the same way so malformed views fail instead of silently changing order.
    array.dtype.match(/\d+/)
    order.join()
    var result = new Array(order.length)
    for (var k = 0; k < order.length; ++k) result[k] = order[k]
    return result
  }

  function matchingOrderCount(arrays, orders, dimension) {
    var matched = 0
    while (matched < dimension) {
      for (var i = 1; i < arrays.length; ++i) {
        if (orders[i][matched] !== orders[0][matched]) return matched
      }
      ++matched
    }
    return matched
  }

  function visitInner(arrays, order, starts, sizes, index, pointers, level, callback) {
    if (level < 0) return callback(pointers, index)
    var coordinates = new Array(level + 1)
    for (var axis = 0; axis <= level; ++axis) {
      var initialDimension = order[axis]
      if (sizes[initialDimension] <= 0) return true
      coordinates[axis] = starts[initialDimension]
      index[initialDimension] = starts[initialDimension]
    }
    while (true) {
      if (callback(pointers, index) === false) return false
      for (var currentAxis = 0; currentAxis <= level; ++currentAxis) {
        var dimension = order[currentAxis]
        coordinates[currentAxis] += 1
        for (var arrayIndex = 0; arrayIndex < arrays.length; ++arrayIndex) {
          pointers[arrayIndex] += arrays[arrayIndex].stride[dimension]
        }
        if (coordinates[currentAxis] < starts[dimension] + sizes[dimension]) {
          index[dimension] = coordinates[currentAxis]
          break
        }
        coordinates[currentAxis] = starts[dimension]
        index[dimension] = starts[dimension]
        for (var resetIndex = 0; resetIndex < arrays.length; ++resetIndex) {
          pointers[resetIndex] -= sizes[dimension] * arrays[resetIndex].stride[dimension]
        }
        if (currentAxis === level) return true
      }
    }
  }

  function visitBlocks(arrays, shape, order, starts, sizes, index, pointers, level, callback) {
    var blockRank = order.length - level
    var blockOptions = new Array(blockRank)
    var blockCounters = new Array(blockRank)
    for (var blockAxis = 0; blockAxis < blockRank; ++blockAxis) {
      var blockDimension = order[level + blockAxis]
      blockOptions[blockAxis] = blocksForExtent(shape[blockDimension], true)
      blockCounters[blockAxis] = 0
      if (blockOptions[blockAxis].length === 0) return true
    }
    while (true) {
      for (var selectionAxis = 0; selectionAxis < blockRank; ++selectionAxis) {
        var selectionDimension = order[level + selectionAxis]
        var selectedBlock = blockOptions[selectionAxis][blockCounters[selectionAxis]]
        starts[selectionDimension] = selectedBlock[0]
        sizes[selectionDimension] = selectedBlock[1]
        index[selectionDimension] = selectedBlock[0]
      }
      for (var arrayIndex = 0; arrayIndex < arrays.length; ++arrayIndex) {
        var address = arrays[arrayIndex].offset | 0
        for (var coordinate = 0; coordinate < shape.length; ++coordinate) {
          address += starts[coordinate] * arrays[arrayIndex].stride[coordinate]
        }
        pointers[arrayIndex] = address
      }
      if (visitInner(arrays, order, starts, sizes, index, pointers, order.length - 1, callback) === false) return false
      var carryAxis = blockRank - 1
      while (carryAxis >= 0) {
        blockCounters[carryAxis] += 1
        if (blockCounters[carryAxis] < blockOptions[carryAxis].length) break
        blockCounters[carryAxis] = 0
        carryAxis -= 1
      }
      if (carryAxis < 0) return true
    }
  }

  function traverse(arrays, callback) {
    checkShapes(arrays)
    var shape = arrays[0].shape.slice(0)
    var dimension = shape.length
    var orders = new Array(arrays.length)
    for (var i = 0; i < arrays.length; ++i) orders[i] = arrayOrder(arrays[i])
    var order = orders[0]
    var matched = matchingOrderCount(arrays, orders, dimension)
    var starts = new Array(dimension)
    var sizes = new Array(dimension)
    var index = new Array(dimension)
    var pointers = new Array(arrays.length)
    for (var j = 0; j < dimension; ++j) {
      starts[j] = 0
      sizes[j] = shape[j]
      index[j] = 0
    }
    for (var k = 0; k < arrays.length; ++k) pointers[k] = arrays[k].offset | 0
    if (dimension === 0) return callback(pointers, index)
    if (matched === dimension) {
      return visitInner(arrays, order, starts, sizes, index, pointers, dimension - 1, callback)
    }
    return visitBlocks(arrays, shape, order, starts, sizes, index, pointers, matched, callback)
  }

  function read(array, address) {
    if (array.dtype === 'generic') return array.data.get(address)
    return array.data[address]
  }

  function write(array, address, value) {
    if (array.dtype === 'generic') array.data.set(address, value)
    else array.data[address] = value
  }

  function primeWrite(array, address) {
    if (array.dtype === 'generic') array.data.get(address)
  }

  function fastTypedDimension(arrays) {
    checkShapes(arrays)
    for (var i = 0; i < arrays.length; ++i) {
      arrayOrder(arrays[i])
      if (arrays[i].dtype === 'generic') return -1
    }
    return arrays[0].shape.length
  }

  function blocksForExtent(extent, blocked) {
    if (!blocked) return [[0, extent]]
    var blocks = []
    var remaining = extent | 0
    while (remaining > 0) {
      var size
      if (remaining < BLOCK_SIZE) {
        size = remaining
        remaining = 0
      } else {
        size = BLOCK_SIZE
        remaining -= BLOCK_SIZE
      }
      blocks.push([remaining, size])
    }
    return blocks
  }

  function applyTypedBinary2(destination, left, right, operator, shortCircuit) {
    var order = destination.order
    var innerDimension = order[0]
    var outerDimension = order[1]
    var matched = left.order[0] === innerDimension && right.order[0] === innerDimension ? 1 : 0
    if (matched === 1 && left.order[1] === outerDimension && right.order[1] === outerDimension) matched = 2
    var innerBlocks = blocksForExtent(destination.shape[innerDimension], matched < 1)
    var outerBlocks = blocksForExtent(destination.shape[outerDimension], matched < 2)
    for (var innerBlockIndex = 0; innerBlockIndex < innerBlocks.length; ++innerBlockIndex) {
      var innerBlock = innerBlocks[innerBlockIndex]
      for (var outerBlockIndex = 0; outerBlockIndex < outerBlocks.length; ++outerBlockIndex) {
        var outerBlock = outerBlocks[outerBlockIndex]
        var outerEnd = outerBlock[0] + outerBlock[1]
        for (var outer = outerBlock[0]; outer < outerEnd; ++outer) {
          var destinationPointer = (destination.offset | 0) + outer * destination.stride[outerDimension] + innerBlock[0] * destination.stride[innerDimension]
          var leftPointer = (left.offset | 0) + outer * left.stride[outerDimension] + innerBlock[0] * left.stride[innerDimension]
          var rightPointer = (right.offset | 0) + outer * right.stride[outerDimension] + innerBlock[0] * right.stride[innerDimension]
          var innerEnd = innerBlock[0] + innerBlock[1]
          if (shortCircuit === 'and') {
            for (var inner = innerBlock[0]; inner < innerEnd; ++inner) {
              destination.data[destinationPointer] = left.data[leftPointer] && right.data[rightPointer]
              destinationPointer += destination.stride[innerDimension]
              leftPointer += left.stride[innerDimension]
              rightPointer += right.stride[innerDimension]
            }
          } else if (shortCircuit === 'or') {
            for (var inner = innerBlock[0]; inner < innerEnd; ++inner) {
              destination.data[destinationPointer] = left.data[leftPointer] || right.data[rightPointer]
              destinationPointer += destination.stride[innerDimension]
              leftPointer += left.stride[innerDimension]
              rightPointer += right.stride[innerDimension]
            }
          } else {
            for (var inner = innerBlock[0]; inner < innerEnd; ++inner) {
              destination.data[destinationPointer] = operator(left.data[leftPointer], right.data[rightPointer])
              destinationPointer += destination.stride[innerDimension]
              leftPointer += left.stride[innerDimension]
              rightPointer += right.stride[innerDimension]
            }
          }
        }
      }
    }
  }

  function applyTypedUnary2(destination, source, operator) {
    var order = destination.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    var matched = source.order[0] === dimension0 ? 1 : 0
    if (matched === 1 && source.order[1] === dimension1) matched = 2
    var blocks0 = blocksForExtent(destination.shape[dimension0], matched < 1)
    var blocks1 = blocksForExtent(destination.shape[dimension1], matched < 2)
    for (var blockIndex0 = 0; blockIndex0 < blocks0.length; ++blockIndex0) {
      var block0 = blocks0[blockIndex0]
      for (var blockIndex1 = 0; blockIndex1 < blocks1.length; ++blockIndex1) {
        var block1 = blocks1[blockIndex1]
        var end1 = block1[0] + block1[1]
        for (var coordinate1 = block1[0]; coordinate1 < end1; ++coordinate1) {
          var destinationPointer = (destination.offset | 0) + coordinate1 * destination.stride[dimension1] + block0[0] * destination.stride[dimension0]
          var sourcePointer = (source.offset | 0) + coordinate1 * source.stride[dimension1] + block0[0] * source.stride[dimension0]
          var end0 = block0[0] + block0[1]
          if (operator === identity) {
            for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
              destination.data[destinationPointer] = source.data[sourcePointer]
              destinationPointer += destination.stride[dimension0]
              sourcePointer += source.stride[dimension0]
            }
          } else if (operator === negate) {
            for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
              destination.data[destinationPointer] = -source.data[sourcePointer]
              destinationPointer += destination.stride[dimension0]
              sourcePointer += source.stride[dimension0]
            }
          } else {
            for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
              destination.data[destinationPointer] = operator(source.data[sourcePointer])
              destinationPointer += destination.stride[dimension0]
              sourcePointer += source.stride[dimension0]
            }
          }
        }
      }
    }
  }

  function applyTypedUnary3(destination, source, operator) {
    var order = destination.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    var dimension2 = order[2]
    var matched = 0
    if (source.order[0] === dimension0) {
      matched = 1
      if (source.order[1] === dimension1) {
        matched = 2
        if (source.order[2] === dimension2) matched = 3
      }
    }
    var blocks0 = blocksForExtent(destination.shape[dimension0], matched < 1)
    var blocks1 = blocksForExtent(destination.shape[dimension1], matched < 2)
    var blocks2 = blocksForExtent(destination.shape[dimension2], matched < 3)
    for (var blockIndex0 = 0; blockIndex0 < blocks0.length; ++blockIndex0) {
      var block0 = blocks0[blockIndex0]
      for (var blockIndex1 = 0; blockIndex1 < blocks1.length; ++blockIndex1) {
        var block1 = blocks1[blockIndex1]
        for (var blockIndex2 = 0; blockIndex2 < blocks2.length; ++blockIndex2) {
          var block2 = blocks2[blockIndex2]
          var end2 = block2[0] + block2[1]
          for (var coordinate2 = block2[0]; coordinate2 < end2; ++coordinate2) {
            var end1 = block1[0] + block1[1]
            for (var coordinate1 = block1[0]; coordinate1 < end1; ++coordinate1) {
              var destinationPointer = (destination.offset | 0) + coordinate2 * destination.stride[dimension2] + coordinate1 * destination.stride[dimension1] + block0[0] * destination.stride[dimension0]
              var sourcePointer = (source.offset | 0) + coordinate2 * source.stride[dimension2] + coordinate1 * source.stride[dimension1] + block0[0] * source.stride[dimension0]
              var end0 = block0[0] + block0[1]
              if (operator === identity) {
                for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                  destination.data[destinationPointer] = source.data[sourcePointer]
                  destinationPointer += destination.stride[dimension0]
                  sourcePointer += source.stride[dimension0]
                }
              } else if (operator === negate) {
                for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                  destination.data[destinationPointer] = -source.data[sourcePointer]
                  destinationPointer += destination.stride[dimension0]
                  sourcePointer += source.stride[dimension0]
                }
              } else {
                for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                  destination.data[destinationPointer] = operator(source.data[sourcePointer])
                  destinationPointer += destination.stride[dimension0]
                  sourcePointer += source.stride[dimension0]
                }
              }
            }
          }
        }
      }
    }
  }

  function sumTyped2(array) {
    var order = array.order
    var innerDimension = order[0]
    var outerDimension = order[1]
    var innerExtent = array.shape[innerDimension]
    var outerExtent = array.shape[outerDimension]
    var sum = 0
    for (var outer = 0; outer < outerExtent; ++outer) {
      var pointer = (array.offset | 0) + outer * array.stride[outerDimension]
      for (var inner = 0; inner < innerExtent; ++inner) {
        sum += array.data[pointer]
        pointer += array.stride[innerDimension]
      }
    }
    return sum
  }

  function sumTyped3(array) {
    var order = array.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    var dimension2 = order[2]
    var extent0 = array.shape[dimension0]
    var extent1 = array.shape[dimension1]
    var extent2 = array.shape[dimension2]
    var sum = 0
    for (var coordinate2 = 0; coordinate2 < extent2; ++coordinate2) {
      for (var coordinate1 = 0; coordinate1 < extent1; ++coordinate1) {
        var pointer = (array.offset | 0) + coordinate2 * array.stride[dimension2] + coordinate1 * array.stride[dimension1]
        for (var coordinate0 = 0; coordinate0 < extent0; ++coordinate0) {
          sum += array.data[pointer]
          pointer += array.stride[dimension0]
        }
      }
    }
    return sum
  }

  function fillTyped2(array, value) {
    var order = array.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    for (var coordinate1 = 0; coordinate1 < array.shape[dimension1]; ++coordinate1) {
      var pointer = (array.offset | 0) + coordinate1 * array.stride[dimension1]
      for (var coordinate0 = 0; coordinate0 < array.shape[dimension0]; ++coordinate0) {
        array.data[pointer] = value
        pointer += array.stride[dimension0]
      }
    }
  }

  function fillTyped3(array, value) {
    var order = array.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    var dimension2 = order[2]
    for (var coordinate2 = 0; coordinate2 < array.shape[dimension2]; ++coordinate2) {
      for (var coordinate1 = 0; coordinate1 < array.shape[dimension1]; ++coordinate1) {
        var pointer = (array.offset | 0) + coordinate2 * array.stride[dimension2] + coordinate1 * array.stride[dimension1]
        for (var coordinate0 = 0; coordinate0 < array.shape[dimension0]; ++coordinate0) {
          array.data[pointer] = value
          pointer += array.stride[dimension0]
        }
      }
    }
  }

  function identity(value) { return value }
  function negate(value) { return -value }

  function applyTypedBinary3(destination, left, right, operator, shortCircuit) {
    var order = destination.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    var dimension2 = order[2]
    var matched = 0
    if (left.order[0] === dimension0 && right.order[0] === dimension0) {
      matched = 1
      if (left.order[1] === dimension1 && right.order[1] === dimension1) {
        matched = 2
        if (left.order[2] === dimension2 && right.order[2] === dimension2) matched = 3
      }
    }
    var blocks0 = blocksForExtent(destination.shape[dimension0], matched < 1)
    var blocks1 = blocksForExtent(destination.shape[dimension1], matched < 2)
    var blocks2 = blocksForExtent(destination.shape[dimension2], matched < 3)
    for (var blockIndex0 = 0; blockIndex0 < blocks0.length; ++blockIndex0) {
      var block0 = blocks0[blockIndex0]
      for (var blockIndex1 = 0; blockIndex1 < blocks1.length; ++blockIndex1) {
        var block1 = blocks1[blockIndex1]
        for (var blockIndex2 = 0; blockIndex2 < blocks2.length; ++blockIndex2) {
          var block2 = blocks2[blockIndex2]
          var end2 = block2[0] + block2[1]
          for (var coordinate2 = block2[0]; coordinate2 < end2; ++coordinate2) {
            var end1 = block1[0] + block1[1]
            for (var coordinate1 = block1[0]; coordinate1 < end1; ++coordinate1) {
              var destinationPointer = (destination.offset | 0) + coordinate2 * destination.stride[dimension2] + coordinate1 * destination.stride[dimension1] + block0[0] * destination.stride[dimension0]
              var leftPointer = (left.offset | 0) + coordinate2 * left.stride[dimension2] + coordinate1 * left.stride[dimension1] + block0[0] * left.stride[dimension0]
              var rightPointer = (right.offset | 0) + coordinate2 * right.stride[dimension2] + coordinate1 * right.stride[dimension1] + block0[0] * right.stride[dimension0]
              var end0 = block0[0] + block0[1]
              if (shortCircuit === 'and') {
                for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                  destination.data[destinationPointer] = left.data[leftPointer] && right.data[rightPointer]
                  destinationPointer += destination.stride[dimension0]
                  leftPointer += left.stride[dimension0]
                  rightPointer += right.stride[dimension0]
                }
              } else if (shortCircuit === 'or') {
                for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                  destination.data[destinationPointer] = left.data[leftPointer] || right.data[rightPointer]
                  destinationPointer += destination.stride[dimension0]
                  leftPointer += left.stride[dimension0]
                  rightPointer += right.stride[dimension0]
                }
              } else {
                for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                  destination.data[destinationPointer] = operator(left.data[leftPointer], right.data[rightPointer])
                  destinationPointer += destination.stride[dimension0]
                  leftPointer += left.stride[dimension0]
                  rightPointer += right.stride[dimension0]
                }
              }
            }
          }
        }
      }
    }
  }

  function assignTyped3(destination, source) {
    var order = destination.order
    var dimension0 = order[0]
    var dimension1 = order[1]
    var dimension2 = order[2]
    var matched = 0
    if (source.order[0] === dimension0) {
      matched = 1
      if (source.order[1] === dimension1) {
        matched = 2
        if (source.order[2] === dimension2) matched = 3
      }
    }
    var blocks0 = blocksForExtent(destination.shape[dimension0], matched < 1)
    var blocks1 = blocksForExtent(destination.shape[dimension1], matched < 2)
    var blocks2 = blocksForExtent(destination.shape[dimension2], matched < 3)
    for (var blockIndex0 = 0; blockIndex0 < blocks0.length; ++blockIndex0) {
      var block0 = blocks0[blockIndex0]
      for (var blockIndex1 = 0; blockIndex1 < blocks1.length; ++blockIndex1) {
        var block1 = blocks1[blockIndex1]
        for (var blockIndex2 = 0; blockIndex2 < blocks2.length; ++blockIndex2) {
          var block2 = blocks2[blockIndex2]
          var end2 = block2[0] + block2[1]
          for (var coordinate2 = block2[0]; coordinate2 < end2; ++coordinate2) {
            var end1 = block1[0] + block1[1]
            for (var coordinate1 = block1[0]; coordinate1 < end1; ++coordinate1) {
              var destinationPointer = (destination.offset | 0) + coordinate2 * destination.stride[dimension2] + coordinate1 * destination.stride[dimension1] + block0[0] * destination.stride[dimension0]
              var sourcePointer = (source.offset | 0) + coordinate2 * source.stride[dimension2] + coordinate1 * source.stride[dimension1] + block0[0] * source.stride[dimension0]
              var end0 = block0[0] + block0[1]
              for (var coordinate0 = block0[0]; coordinate0 < end0; ++coordinate0) {
                destination.data[destinationPointer] = source.data[sourcePointer]
                destinationPointer += destination.stride[dimension0]
                sourcePointer += source.stride[dimension0]
              }
            }
          }
        }
      }
    }
  }

  function defineBinary(name, operator, scalarFirst, shortCircuit) {
    var arrayOperation = ternaryFunction(name, function (destination, left, right) {
      var fastDimension = fastTypedDimension([destination, left, right])
      if (fastDimension === 1) {
        var count = destination.shape[0]
        var destinationPointer = destination.offset | 0
        var leftPointer = left.offset | 0
        var rightPointer = right.offset | 0
        var destinationStride = destination.stride[0]
        var leftStride = left.stride[0]
        var rightStride = right.stride[0]
        if (shortCircuit === 'and') {
          for (var i = 0; i < count; ++i) {
            destination.data[destinationPointer] = left.data[leftPointer] && right.data[rightPointer]
            destinationPointer += destinationStride
            leftPointer += leftStride
            rightPointer += rightStride
          }
        } else if (shortCircuit === 'or') {
          for (var i = 0; i < count; ++i) {
            destination.data[destinationPointer] = left.data[leftPointer] || right.data[rightPointer]
            destinationPointer += destinationStride
            leftPointer += leftStride
            rightPointer += rightStride
          }
        } else {
          for (var i = 0; i < count; ++i) {
            destination.data[destinationPointer] = operator(left.data[leftPointer], right.data[rightPointer])
            destinationPointer += destinationStride
            leftPointer += leftStride
            rightPointer += rightStride
          }
        }
        return destination
      }
      if (fastDimension === 2) {
        applyTypedBinary2(destination, left, right, operator, shortCircuit)
        return destination
      }
      if (fastDimension === 3) {
        applyTypedBinary3(destination, left, right, operator, shortCircuit)
        return destination
      }
      traverse([destination, left, right], function (pointers) {
        primeWrite(destination, pointers[0])
        var leftValue = read(left, pointers[1])
        var value
        if (shortCircuit === 'and') value = leftValue && read(right, pointers[2])
        else if (shortCircuit === 'or') value = leftValue || read(right, pointers[2])
        else value = operator(leftValue, read(right, pointers[2]))
        write(destination, pointers[0], value)
      })
      return destination
    })
    var inPlaceOperation = binaryFunction(name + 'eq', function (destination, right) {
      if (fastTypedDimension([destination, right]) === 1) {
        var count = destination.shape[0]
        var destinationPointer = destination.offset | 0
        var rightPointer = right.offset | 0
        var destinationStride = destination.stride[0]
        var rightStride = right.stride[0]
        if (shortCircuit === 'and') {
          for (var i = 0; i < count; ++i) {
            destination.data[destinationPointer] = destination.data[destinationPointer] && right.data[rightPointer]
            destinationPointer += destinationStride
            rightPointer += rightStride
          }
        } else if (shortCircuit === 'or') {
          for (var i = 0; i < count; ++i) {
            destination.data[destinationPointer] = destination.data[destinationPointer] || right.data[rightPointer]
            destinationPointer += destinationStride
            rightPointer += rightStride
          }
        } else {
          for (var i = 0; i < count; ++i) {
            destination.data[destinationPointer] = operator(destination.data[destinationPointer], right.data[rightPointer])
            destinationPointer += destinationStride
            rightPointer += rightStride
          }
        }
        return destination
      }
      traverse([destination, right], function (pointers) {
        var leftValue = read(destination, pointers[0])
        var value
        if (shortCircuit === 'and') value = leftValue && read(right, pointers[1])
        else if (shortCircuit === 'or') value = leftValue || read(right, pointers[1])
        else value = operator(leftValue, read(right, pointers[1]))
        write(destination, pointers[0], value)
      })
      return destination
    }, true)
    var scalarOperation = ternaryFunction(name + 's', function (destination, left, scalar) {
      if (fastTypedDimension([destination, left]) === 1) {
        var count = destination.shape[0]
        var destinationPointer = destination.offset | 0
        var leftPointer = left.offset | 0
        var destinationStride = destination.stride[0]
        var leftStride = left.stride[0]
        for (var i = 0; i < count; ++i) {
          destination.data[destinationPointer] = operator(left.data[leftPointer], scalar)
          destinationPointer += destinationStride
          leftPointer += leftStride
        }
        return destination
      }
      traverse([destination, left], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], operator(read(left, pointers[1]), scalar))
      })
      return destination
    })
    var scalarInPlaceOperation = binaryFunction(name + 'seq', function (destination, scalar) {
      if (fastTypedDimension([destination]) === 1) {
        var count = destination.shape[0]
        var destinationPointer = destination.offset | 0
        var destinationStride = destination.stride[0]
        for (var i = 0; i < count; ++i) {
          destination.data[destinationPointer] = operator(destination.data[destinationPointer], scalar)
          destinationPointer += destinationStride
        }
        return destination
      }
      traverse([destination], function (pointers) {
        write(destination, pointers[0], operator(read(destination, pointers[0]), scalar))
      })
      return destination
    }, true)
    operations[name] = arrayOperation
    if (scalarFirst) {
      operations[name + 's'] = scalarOperation
      operations[name + 'eq'] = inPlaceOperation
    } else {
      operations[name + 'eq'] = inPlaceOperation
      operations[name + 's'] = scalarOperation
    }
    operations[name + 'seq'] = scalarInPlaceOperation
  }

  defineBinary('add', function (a, b) { return a + b })
  defineBinary('sub', function (a, b) { return a - b })
  defineBinary('mul', function (a, b) { return a * b })
  defineBinary('div', function (a, b) { return a / b })
  defineBinary('mod', function (a, b) { return a % b })
  defineBinary('band', function (a, b) { return a & b })
  defineBinary('bor', function (a, b) { return a | b })
  defineBinary('bxor', function (a, b) { return a ^ b })
  defineBinary('lshift', function (a, b) { return a << b })
  defineBinary('rshift', function (a, b) { return a >> b })
  defineBinary('rrshift', function (a, b) { return a >>> b })

  function defineUnary(name, operator) {
    operations[name] = binaryFunction(name, function (destination, source) {
      var fastDimension = fastTypedDimension([destination, source])
      if (fastDimension === 1) {
        var count = destination.shape[0]
        var destinationPointer = destination.offset | 0
        var sourcePointer = source.offset | 0
        for (var i = 0; i < count; ++i) {
          destination.data[destinationPointer] = operator(source.data[sourcePointer])
          destinationPointer += destination.stride[0]
          sourcePointer += source.stride[0]
        }
        return destination
      }
      if (fastDimension === 2) {
        applyTypedUnary2(destination, source, operator)
        return destination
      }
      if (fastDimension === 3) {
        applyTypedUnary3(destination, source, operator)
        return destination
      }
      traverse([destination, source], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], operator(read(source, pointers[1])))
      })
      return destination
    }, true)
    operations[name + 'eq'] = unaryFunction(name + 'eq', function (destination) {
      var fastDimension = fastTypedDimension([destination])
      if (fastDimension === 1) {
        var count = destination.shape[0]
        var pointer = destination.offset | 0
        for (var i = 0; i < count; ++i) {
          destination.data[pointer] = operator(destination.data[pointer])
          pointer += destination.stride[0]
        }
        return destination
      }
      if (fastDimension === 2) {
        applyTypedUnary2(destination, destination, operator)
        return destination
      }
      if (fastDimension === 3) {
        applyTypedUnary3(destination, destination, operator)
        return destination
      }
      traverse([destination], function (pointers) {
        write(destination, pointers[0], operator(read(destination, pointers[0])))
      })
      return destination
    }, true)
  }

  defineUnary('not', function (value) { return !value })
  defineUnary('bnot', function (value) { return ~value })
  defineUnary('neg', negate)
  defineUnary('recip', function (value) { return 1.0 / value })

  defineBinary('and', function (a, b) { return a && b }, true, 'and')
  defineBinary('or', function (a, b) { return a || b }, true, 'or')
  defineBinary('eq', function (a, b) { return a === b }, true)
  defineBinary('neq', function (a, b) { return a !== b }, true)
  defineBinary('lt', function (a, b) { return a < b }, true)
  defineBinary('gt', function (a, b) { return a > b }, true)
  defineBinary('leq', function (a, b) { return a <= b }, true)
  defineBinary('geq', function (a, b) { return a >= b }, true)

  function defineMathUnary(name) {
    operations[name] = binaryFunction(name, function (destination, source) {
      var mathFunction = Math[name]
      var fastDimension = fastTypedDimension([destination, source])
      if (fastDimension === 1) {
        var count = destination.shape[0]
        var destinationPointer = destination.offset | 0
        var sourcePointer = source.offset | 0
        for (var i = 0; i < count; ++i) {
          destination.data[destinationPointer] = mathFunction(source.data[sourcePointer])
          destinationPointer += destination.stride[0]
          sourcePointer += source.stride[0]
        }
        return destination
      }
      if (fastDimension === 2) {
        applyTypedUnary2(destination, source, mathFunction)
        return destination
      }
      if (fastDimension === 3) {
        applyTypedUnary3(destination, source, mathFunction)
        return destination
      }
      traverse([destination, source], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], mathFunction(read(source, pointers[1])))
      })
      return destination
    }, true)
    operations[name + 'eq'] = unaryFunction(name + 'eq', function (destination) {
      var mathFunction = Math[name]
      var fastDimension = fastTypedDimension([destination])
      if (fastDimension === 1) {
        var count = destination.shape[0]
        var pointer = destination.offset | 0
        for (var i = 0; i < count; ++i) {
          destination.data[pointer] = mathFunction(destination.data[pointer])
          pointer += destination.stride[0]
        }
        return destination
      }
      if (fastDimension === 2) {
        applyTypedUnary2(destination, destination, mathFunction)
        return destination
      }
      if (fastDimension === 3) {
        applyTypedUnary3(destination, destination, mathFunction)
        return destination
      }
      traverse([destination], function (pointers) {
        write(destination, pointers[0], mathFunction(read(destination, pointers[0])))
      })
      return destination
    }, true)
  }

  ;['abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'exp', 'floor', 'log', 'round', 'sin', 'sqrt', 'tan'].forEach(defineMathUnary)

  function defineMathBinary(name) {
    var arrayOperation = ternaryFunction(name, function (destination, left, right) {
      var mathFunction = Math[name]
      traverse([destination, left, right], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], mathFunction(read(left, pointers[1]), read(right, pointers[2])))
      })
      return destination
    })
    var inPlaceOperation = binaryFunction(name + 'eq', function (destination, right) {
      var mathFunction = Math[name]
      traverse([destination, right], function (pointers) {
        write(destination, pointers[0], mathFunction(read(destination, pointers[0]), read(right, pointers[1])))
      })
      return destination
    }, true)
    var scalarOperation = ternaryFunction(name + 's', function (destination, left, scalar) {
      var mathFunction = Math[name]
      traverse([destination, left], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], mathFunction(read(left, pointers[1]), scalar))
      })
      return destination
    })
    var scalarInPlaceOperation = binaryFunction(name + 'seq', function (destination, scalar) {
      var mathFunction = Math[name]
      traverse([destination], function (pointers) {
        write(destination, pointers[0], mathFunction(read(destination, pointers[0]), scalar))
      })
      return destination
    }, true)
    operations[name] = arrayOperation
    operations[name + 's'] = scalarOperation
    operations[name + 'eq'] = inPlaceOperation
    operations[name + 'seq'] = scalarInPlaceOperation
  }

  ;['max', 'min', 'atan2', 'pow'].forEach(defineMathBinary)

  function defineReverseMath(name) {
    operations[name + 'op'] = ternaryFunction(name + 'op', function (destination, left, right) {
      var mathFunction = Math[name]
      traverse([destination, left, right], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], mathFunction(read(right, pointers[2]), read(left, pointers[1])))
      })
      return destination
    })
    operations[name + 'ops'] = ternaryFunction(name + 'ops', function (destination, left, scalar) {
      var mathFunction = Math[name]
      traverse([destination, left], function (pointers) {
        primeWrite(destination, pointers[0])
        write(destination, pointers[0], mathFunction(scalar, read(left, pointers[1])))
      })
      return destination
    })
    operations[name + 'opeq'] = binaryFunction(name + 'opeq', function (destination, right) {
      var mathFunction = Math[name]
      traverse([destination, right], function (pointers) {
        write(destination, pointers[0], mathFunction(read(right, pointers[1]), read(destination, pointers[0])))
      })
      return destination
    }, true)
    operations[name + 'opseq'] = binaryFunction(name + 'opseq', function (destination, scalar) {
      var mathFunction = Math[name]
      traverse([destination], function (pointers) {
        write(destination, pointers[0], mathFunction(scalar, read(destination, pointers[0])))
      })
      return destination
    }, true)
  }

  ;['atan2', 'pow'].forEach(defineReverseMath)

  operations.any = unaryFunction('any', function (array) {
    var result = false
    traverse([array], function (pointers) {
      if (read(array, pointers[0])) {
        result = true
        return false
      }
    })
    return result
  })

  operations.all = unaryFunction('all', function (array) {
    var result = true
    traverse([array], function (pointers) {
      if (!read(array, pointers[0])) {
        result = false
        return false
      }
    })
    return result
  })

  function defineReducer(name, initialValue, reducer, finish) {
    operations[name] = unaryFunction(name, function (array) {
      var value = initialValue
      if (fastTypedDimension([array]) === 1) {
        var count = array.shape[0]
        var pointer = array.offset | 0
        var stride = array.stride[0]
        for (var i = 0; i < count; ++i) {
          value = reducer(value, array.data[pointer])
          pointer += stride
        }
        return finish ? finish(value) : value
      }
      traverse([array], function (pointers) {
        value = reducer(value, read(array, pointers[0]))
      })
      return finish ? finish(value) : value
    })
  }

  defineReducer('sum', 0, function (sum, value) { return sum + value })
  defineReducer('prod', 1, function (product, value) { return product * value })
  defineReducer('norm2squared', 0, function (sum, value) { return sum + value * value })
  defineReducer('norm2', 0, function (sum, value) { return sum + value * value }, function (value) { return Math.sqrt(value) })
  defineReducer('norminf', 0, function (largest, value) {
    if (-value > largest) return -value
    if (value > largest) return value
    return largest
  })
  defineReducer('norm1', 0, function (sum, value) { return sum + (value < 0 ? -value : value) })
  defineReducer('sup', -Infinity, function (largest, value) { return value > largest ? value : largest })
  defineReducer('inf', Infinity, function (smallest, value) { return value < smallest ? value : smallest })

  function sumTyped1(array) {
    var sum = 0
    var data = array.data
    var count = array.shape[0]
    var pointer = array.offset | 0
    var stride = array.stride[0]
    for (var i = 0; i < count; ++i) {
      sum += data[pointer]
      pointer += stride
    }
    return sum
  }

  function sumOperation(array) {
    var fastDimension = fastTypedDimension([array])
    if (fastDimension === 1) return sumTyped1(array)
    if (fastDimension === 2) return sumTyped2(array)
    if (fastDimension === 3) return sumTyped3(array)
    var sum = 0
    traverse([array], function (pointers) { sum += read(array, pointers[0]) })
    return sum
  }

  operations.sum = setName(sumOperation, 'sum_cwise_thunk')

  function defineArgExtreme(name, initialValue, isBetter) {
    operations[name] = unaryFunction(name, function (array) {
      var bestValue = initialValue
      var bestIndex = array.shape.slice(0)
      traverse([array], function (pointers, index) {
        var value = read(array, pointers[0])
        if (isBetter(value, bestValue)) {
          bestValue = value
          bestIndex = index.slice(0)
        }
      })
      return bestIndex
    })
  }

  defineArgExtreme('argmin', Infinity, function (value, best) { return value < best })
  defineArgExtreme('argmax', -Infinity, function (value, best) { return value > best })

  setName(operations.sup, 'cwise_cwise_thunk')
  setName(operations.inf, 'cwise_cwise_thunk')
  setName(operations.argmin, 'cwise_cwise_thunk')
  setName(operations.argmax, 'cwise_cwise_thunk')

  operations.random = unaryFunction('random', function (array) {
    var random = Math.random
    traverse([array], function (pointers) {
      primeWrite(array, pointers[0])
      write(array, pointers[0], random())
    })
    return array
  }, true)

  operations.assign = binaryFunction('assign', function (destination, source) {
    var fastDimension = fastTypedDimension([destination, source])
    if (fastDimension === 1) {
      var count = destination.shape[0]
      var destinationPointer = destination.offset | 0
      var sourcePointer = source.offset | 0
      var destinationStride = destination.stride[0]
      var sourceStride = source.stride[0]
      for (var i = 0; i < count; ++i) {
        destination.data[destinationPointer] = source.data[sourcePointer]
        destinationPointer += destinationStride
        sourcePointer += sourceStride
      }
      return destination
    }
    if (fastDimension === 2) {
      applyTypedUnary2(destination, source, identity)
      return destination
    }
    if (fastDimension === 3) {
      assignTyped3(destination, source)
      return destination
    }
    traverse([destination, source], function (pointers) {
      primeWrite(destination, pointers[0])
      write(destination, pointers[0], read(source, pointers[1]))
    })
    return destination
  }, true)

  operations.assigns = binaryFunction('assigns', function (destination, scalar) {
    var fastDimension = fastTypedDimension([destination])
    if (fastDimension === 1) {
      var count = destination.shape[0]
      var pointer = destination.offset | 0
      var stride = destination.stride[0]
      for (var i = 0; i < count; ++i) {
        destination.data[pointer] = scalar
        pointer += stride
      }
      return destination
    }
    if (fastDimension === 2) {
      fillTyped2(destination, scalar)
      return destination
    }
    if (fastDimension === 3) {
      fillTyped3(destination, scalar)
      return destination
    }
    traverse([destination], function (pointers) {
      primeWrite(destination, pointers[0])
      write(destination, pointers[0], scalar)
    })
    return destination
  }, true)

  operations.equals = binaryFunction('equals', function (left, right) {
    var result = true
    traverse([left, right], function (pointers) {
      if (read(left, pointers[0]) !== read(right, pointers[1])) {
        result = false
        return false
      }
    })
    return result
  })

  // Reject accidental prototype pollution of the API object during construction.
  for (var key in operations) {
    if (!hasOwn.call(operations, key)) delete operations[key]
  }
  return operations
})
