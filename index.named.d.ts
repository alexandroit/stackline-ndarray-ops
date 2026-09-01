export interface IndexedStorage<T = any> {
  readonly length: number
  [index: number]: T
}

export interface GenericStorage<T = any> {
  readonly length: number
  get(index: number): T
  set(index: number, value: T): unknown
}

export type NdArrayStorage<T = any> = IndexedStorage<T> | GenericStorage<T>

/** A structural ndarray view accepted by every operation. */
export interface NdArrayLike<T = any, D extends NdArrayStorage<T> = NdArrayStorage<T>> {
  data: D
  shape: number[]
  stride: number[]
  offset: number
  dtype: string
  readonly order: ArrayLike<number>
}

export type UnaryArrayOperation = <A extends NdArrayLike>(destination: A, source: NdArrayLike) => A
export type UnaryInPlaceOperation = <A extends NdArrayLike>(destination: A) => A
export type BinaryArrayOperation = <A extends NdArrayLike>(destination: A, left: NdArrayLike, right: NdArrayLike) => A
export type BinaryInPlaceOperation = <A extends NdArrayLike>(destination: A, right: NdArrayLike) => A
export type ArrayScalarOperation = <A extends NdArrayLike>(destination: A, source: NdArrayLike, scalar: any) => A
export type ScalarInPlaceOperation = <A extends NdArrayLike>(destination: A, scalar: any) => A

export const add: BinaryArrayOperation
export const addeq: BinaryInPlaceOperation
export const adds: ArrayScalarOperation
export const addseq: ScalarInPlaceOperation
export const sub: BinaryArrayOperation
export const subeq: BinaryInPlaceOperation
export const subs: ArrayScalarOperation
export const subseq: ScalarInPlaceOperation
export const mul: BinaryArrayOperation
export const muleq: BinaryInPlaceOperation
export const muls: ArrayScalarOperation
export const mulseq: ScalarInPlaceOperation
export const div: BinaryArrayOperation
export const diveq: BinaryInPlaceOperation
export const divs: ArrayScalarOperation
export const divseq: ScalarInPlaceOperation
export const mod: BinaryArrayOperation
export const modeq: BinaryInPlaceOperation
export const mods: ArrayScalarOperation
export const modseq: ScalarInPlaceOperation
export const band: BinaryArrayOperation
export const bandeq: BinaryInPlaceOperation
export const bands: ArrayScalarOperation
export const bandseq: ScalarInPlaceOperation
export const bor: BinaryArrayOperation
export const boreq: BinaryInPlaceOperation
export const bors: ArrayScalarOperation
export const borseq: ScalarInPlaceOperation
export const bxor: BinaryArrayOperation
export const bxoreq: BinaryInPlaceOperation
export const bxors: ArrayScalarOperation
export const bxorseq: ScalarInPlaceOperation
export const lshift: BinaryArrayOperation
export const lshifteq: BinaryInPlaceOperation
export const lshifts: ArrayScalarOperation
export const lshiftseq: ScalarInPlaceOperation
export const rshift: BinaryArrayOperation
export const rshifteq: BinaryInPlaceOperation
export const rshifts: ArrayScalarOperation
export const rshiftseq: ScalarInPlaceOperation
export const rrshift: BinaryArrayOperation
export const rrshifteq: BinaryInPlaceOperation
export const rrshifts: ArrayScalarOperation
export const rrshiftseq: ScalarInPlaceOperation

export const not: UnaryArrayOperation
export const noteq: UnaryInPlaceOperation
export const bnot: UnaryArrayOperation
export const bnoteq: UnaryInPlaceOperation
export const neg: UnaryArrayOperation
export const negeq: UnaryInPlaceOperation
export const recip: UnaryArrayOperation
export const recipeq: UnaryInPlaceOperation

export const and: BinaryArrayOperation
export const ands: ArrayScalarOperation
export const andeq: BinaryInPlaceOperation
export const andseq: ScalarInPlaceOperation
export const or: BinaryArrayOperation
export const ors: ArrayScalarOperation
export const oreq: BinaryInPlaceOperation
export const orseq: ScalarInPlaceOperation
export const eq: BinaryArrayOperation
export const eqs: ArrayScalarOperation
export const eqeq: BinaryInPlaceOperation
export const eqseq: ScalarInPlaceOperation
export const neq: BinaryArrayOperation
export const neqs: ArrayScalarOperation
export const neqeq: BinaryInPlaceOperation
export const neqseq: ScalarInPlaceOperation
export const lt: BinaryArrayOperation
export const lts: ArrayScalarOperation
export const lteq: BinaryInPlaceOperation
export const ltseq: ScalarInPlaceOperation
export const gt: BinaryArrayOperation
export const gts: ArrayScalarOperation
export const gteq: BinaryInPlaceOperation
export const gtseq: ScalarInPlaceOperation
export const leq: BinaryArrayOperation
export const leqs: ArrayScalarOperation
export const leqeq: BinaryInPlaceOperation
export const leqseq: ScalarInPlaceOperation
export const geq: BinaryArrayOperation
export const geqs: ArrayScalarOperation
export const geqeq: BinaryInPlaceOperation
export const geqseq: ScalarInPlaceOperation

export const abs: UnaryArrayOperation
export const abseq: UnaryInPlaceOperation
export const acos: UnaryArrayOperation
export const acoseq: UnaryInPlaceOperation
export const asin: UnaryArrayOperation
export const asineq: UnaryInPlaceOperation
export const atan: UnaryArrayOperation
export const ataneq: UnaryInPlaceOperation
export const ceil: UnaryArrayOperation
export const ceileq: UnaryInPlaceOperation
export const cos: UnaryArrayOperation
export const coseq: UnaryInPlaceOperation
export const exp: UnaryArrayOperation
export const expeq: UnaryInPlaceOperation
export const floor: UnaryArrayOperation
export const flooreq: UnaryInPlaceOperation
export const log: UnaryArrayOperation
export const logeq: UnaryInPlaceOperation
export const round: UnaryArrayOperation
export const roundeq: UnaryInPlaceOperation
export const sin: UnaryArrayOperation
export const sineq: UnaryInPlaceOperation
export const sqrt: UnaryArrayOperation
export const sqrteq: UnaryInPlaceOperation
export const tan: UnaryArrayOperation
export const taneq: UnaryInPlaceOperation

export const max: BinaryArrayOperation
export const maxs: ArrayScalarOperation
export const maxeq: BinaryInPlaceOperation
export const maxseq: ScalarInPlaceOperation
export const min: BinaryArrayOperation
export const mins: ArrayScalarOperation
export const mineq: BinaryInPlaceOperation
export const minseq: ScalarInPlaceOperation
export const atan2: BinaryArrayOperation
export const atan2s: ArrayScalarOperation
export const atan2eq: BinaryInPlaceOperation
export const atan2seq: ScalarInPlaceOperation
export const pow: BinaryArrayOperation
export const pows: ArrayScalarOperation
export const poweq: BinaryInPlaceOperation
export const powseq: ScalarInPlaceOperation

export const atan2op: BinaryArrayOperation
export const atan2ops: ArrayScalarOperation
export const atan2opeq: BinaryInPlaceOperation
export const atan2opseq: ScalarInPlaceOperation
export const powop: BinaryArrayOperation
export const powops: ArrayScalarOperation
export const powopeq: BinaryInPlaceOperation
export const powopseq: ScalarInPlaceOperation

export function any(array: NdArrayLike): boolean
export function all(array: NdArrayLike): boolean
export function sum(array: NdArrayLike): number
export function prod(array: NdArrayLike): number
export function norm2squared(array: NdArrayLike): number
export function norm2(array: NdArrayLike): number
export function norminf(array: NdArrayLike): number
export function norm1(array: NdArrayLike): number
export function sup(array: NdArrayLike): number
export function inf(array: NdArrayLike): number
export function argmin(array: NdArrayLike): number[]
export function argmax(array: NdArrayLike): number[]
export function random<A extends NdArrayLike>(array: A): A
export function assign<A extends NdArrayLike>(destination: A, source: NdArrayLike): A
export function assigns<A extends NdArrayLike>(destination: A, scalar: any): A
export function equals(left: NdArrayLike, right: NdArrayLike): boolean

export interface Operations {
  readonly add: typeof add
  readonly addeq: typeof addeq
  readonly adds: typeof adds
  readonly addseq: typeof addseq
  readonly sub: typeof sub
  readonly subeq: typeof subeq
  readonly subs: typeof subs
  readonly subseq: typeof subseq
  readonly mul: typeof mul
  readonly muleq: typeof muleq
  readonly muls: typeof muls
  readonly mulseq: typeof mulseq
  readonly div: typeof div
  readonly diveq: typeof diveq
  readonly divs: typeof divs
  readonly divseq: typeof divseq
  readonly mod: typeof mod
  readonly modeq: typeof modeq
  readonly mods: typeof mods
  readonly modseq: typeof modseq
  readonly band: typeof band
  readonly bandeq: typeof bandeq
  readonly bands: typeof bands
  readonly bandseq: typeof bandseq
  readonly bor: typeof bor
  readonly boreq: typeof boreq
  readonly bors: typeof bors
  readonly borseq: typeof borseq
  readonly bxor: typeof bxor
  readonly bxoreq: typeof bxoreq
  readonly bxors: typeof bxors
  readonly bxorseq: typeof bxorseq
  readonly lshift: typeof lshift
  readonly lshifteq: typeof lshifteq
  readonly lshifts: typeof lshifts
  readonly lshiftseq: typeof lshiftseq
  readonly rshift: typeof rshift
  readonly rshifteq: typeof rshifteq
  readonly rshifts: typeof rshifts
  readonly rshiftseq: typeof rshiftseq
  readonly rrshift: typeof rrshift
  readonly rrshifteq: typeof rrshifteq
  readonly rrshifts: typeof rrshifts
  readonly rrshiftseq: typeof rrshiftseq
  readonly not: typeof not
  readonly noteq: typeof noteq
  readonly bnot: typeof bnot
  readonly bnoteq: typeof bnoteq
  readonly neg: typeof neg
  readonly negeq: typeof negeq
  readonly recip: typeof recip
  readonly recipeq: typeof recipeq
  readonly and: typeof and
  readonly ands: typeof ands
  readonly andeq: typeof andeq
  readonly andseq: typeof andseq
  readonly or: typeof or
  readonly ors: typeof ors
  readonly oreq: typeof oreq
  readonly orseq: typeof orseq
  readonly eq: typeof eq
  readonly eqs: typeof eqs
  readonly eqeq: typeof eqeq
  readonly eqseq: typeof eqseq
  readonly neq: typeof neq
  readonly neqs: typeof neqs
  readonly neqeq: typeof neqeq
  readonly neqseq: typeof neqseq
  readonly lt: typeof lt
  readonly lts: typeof lts
  readonly lteq: typeof lteq
  readonly ltseq: typeof ltseq
  readonly gt: typeof gt
  readonly gts: typeof gts
  readonly gteq: typeof gteq
  readonly gtseq: typeof gtseq
  readonly leq: typeof leq
  readonly leqs: typeof leqs
  readonly leqeq: typeof leqeq
  readonly leqseq: typeof leqseq
  readonly geq: typeof geq
  readonly geqs: typeof geqs
  readonly geqeq: typeof geqeq
  readonly geqseq: typeof geqseq
  readonly abs: typeof abs
  readonly abseq: typeof abseq
  readonly acos: typeof acos
  readonly acoseq: typeof acoseq
  readonly asin: typeof asin
  readonly asineq: typeof asineq
  readonly atan: typeof atan
  readonly ataneq: typeof ataneq
  readonly ceil: typeof ceil
  readonly ceileq: typeof ceileq
  readonly cos: typeof cos
  readonly coseq: typeof coseq
  readonly exp: typeof exp
  readonly expeq: typeof expeq
  readonly floor: typeof floor
  readonly flooreq: typeof flooreq
  readonly log: typeof log
  readonly logeq: typeof logeq
  readonly round: typeof round
  readonly roundeq: typeof roundeq
  readonly sin: typeof sin
  readonly sineq: typeof sineq
  readonly sqrt: typeof sqrt
  readonly sqrteq: typeof sqrteq
  readonly tan: typeof tan
  readonly taneq: typeof taneq
  readonly max: typeof max
  readonly maxs: typeof maxs
  readonly maxeq: typeof maxeq
  readonly maxseq: typeof maxseq
  readonly min: typeof min
  readonly mins: typeof mins
  readonly mineq: typeof mineq
  readonly minseq: typeof minseq
  readonly atan2: typeof atan2
  readonly atan2s: typeof atan2s
  readonly atan2eq: typeof atan2eq
  readonly atan2seq: typeof atan2seq
  readonly pow: typeof pow
  readonly pows: typeof pows
  readonly poweq: typeof poweq
  readonly powseq: typeof powseq
  readonly atan2op: typeof atan2op
  readonly atan2ops: typeof atan2ops
  readonly atan2opeq: typeof atan2opeq
  readonly atan2opseq: typeof atan2opseq
  readonly powop: typeof powop
  readonly powops: typeof powops
  readonly powopeq: typeof powopeq
  readonly powopseq: typeof powopseq
  readonly any: typeof any
  readonly all: typeof all
  readonly prod: typeof prod
  readonly norm2squared: typeof norm2squared
  readonly norm2: typeof norm2
  readonly norminf: typeof norminf
  readonly norm1: typeof norm1
  readonly sup: typeof sup
  readonly inf: typeof inf
  readonly random: typeof random
  readonly assign: typeof assign
  readonly assigns: typeof assigns
  readonly equals: typeof equals
  readonly argmin: typeof argmin
  readonly argmax: typeof argmax
  readonly sum: typeof sum
}

declare const operations: Operations

export default operations
export as namespace ndarrayOps
