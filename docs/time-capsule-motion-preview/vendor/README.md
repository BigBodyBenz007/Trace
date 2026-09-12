# Vendored rendering dependency

Three.js 0.180.0, MIT license (see `LICENSE`). These unmodified files were obtained
from the published npm package via `https://cdn.jsdelivr.net/npm/three@0.180.0/`:

| Local file | Package path | SHA-256 |
| --- | --- | --- |
| three.module.js | build/three.module.js | c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a |
| three.core.js | build/three.core.js | eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20 |
| RoundedBoxGeometry.js | examples/jsm/geometries/RoundedBoxGeometry.js | c1b7c9bd2cddff2e3f3a0723f618a3d364a47450e3d25771d21faed88410bec8 |

The import map resolves `three` locally. No production dependency or runtime CDN
request is added. Source: https://github.com/mrdoob/three.js/tree/r180

The published `three.core.js` contains one mixed-indentation line reported by
`git diff --check`. It is retained to keep the dependency identical to upstream;
project-authored files pass the whitespace check separately.
