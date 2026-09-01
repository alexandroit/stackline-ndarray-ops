# Third-party licenses

The production package has zero runtime, optional, peer, and bundled
dependencies. Its installed production closure is one MIT-licensed root node.

## ndarray-ops@1.2.2

The public operation set, naming, traversal contract, documentation structure,
and compatibility tests derive from `ndarray-ops@1.2.2`, Copyright (c) 2013
Mikola Lysenko, MIT. The applicable license is preserved in `LICENSE`.

The continuation replaces the upstream `cwise-compiler` runtime with an
independently written static walker. No code from cwise-compiler or `uniq` is
included in the production artifact.

## DefinitelyTyped ndarray-ops declarations

The declaration inventory was adapted from
`DefinitelyTyped/types/ndarray-ops`, MIT. A copy of that license is in
`licenses/DefinitelyTyped-ndarray-ops-MIT.txt`. The continuation corrects the
historical declarations: all mutating operations return the destination view,
and `argmin`/`argmax` each accept one ndarray and return its logical index.
