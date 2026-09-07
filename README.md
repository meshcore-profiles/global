# Global

Shared scripts used across every MeshCore backend project - added as a git submodule at `global/` in each consuming repo's root (that exact path matters, see [Usage](#usage) below).

## Contents

- [`services/redis.js`](services/redis.js) - shared Redis client (database 8), connected once on import.
- [`services/axios.js`](services/axios.js) - shared axios instance with a custom `User-Agent` built from the consuming repo's own `package.json`, and a default timeout.
- [`database/mongoose.js`](database/mongoose.js) - single Mongoose connection, connected on import.
- [`database/syncIndexes.js`](database/syncIndexes.js) - standalone script that syncs Mongoose indexes for every model in the consuming repo's own `database/models` against the actual state in MongoDB.

## Used by

- [meshcore-profiles/map](https://github.com/meshcore-profiles/map) (mapa.meshcorepolska.org / map.meshcoreprofiles.com)
- [meshcore-profiles/website](https://github.com/meshcore-profiles/website) (meshcoreprofiles.com)
- [meshcore-profiles/cronjobs](https://github.com/meshcore-profiles/cronjobs)
- [meshcore-pl/website](https://github.com/meshcore-pl/website) (meshcorepolska.org)
- [meshcore-pl/dokumentacja](https://github.com/meshcore-pl/dokumentacja) (docs.meshcorepolska.org)
- [meshcore-pl/flasher](https://github.com/meshcore-pl/flasher)

## Usage

```
git submodule add https://github.com/meshcore-profiles/global.git global
```

Clone a consuming repo with `git clone --recurse-submodules`, or run `git submodule update --init` after a plain clone.

`services/axios.js` and `database/syncIndexes.js` locate the consuming repo's own `package.json` / `database/models` via a fixed relative path from their own location inside this submodule - this only works when the submodule sits at exactly `<repo-root>/global/`.

## Editing

Never edit these files from inside a consuming repo. Change them here, commit, push, then bump the submodule pointer in each consuming repo (`cd global && git pull && cd .. && git add global && git commit`).
