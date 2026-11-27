# Global

Shared scripts used across every MeshCore backend project - added as a git submodule at `global/` in each consuming repo's root (that exact path matters, see [Usage](#usage) below).

## Contents

- [`services/redis.js`](services/redis.js) - shared Redis client (database 8), connected once on import.
- [`services/axios.js`](services/axios.js) - shared axios instance with a custom `User-Agent` built from the consuming repo's own `package.json`, and a default timeout.
- [`services/nodeCache.js`](services/nodeCache.js) - reads the MeshCore node buffers cached in Redis (`meshcore:nodes:all`/`meshcore:nodes:pl`/`meshcore:nodes:updatedAt`, written by `meshcore-profiles/cronjobs`) and exposes `getCachedNodes`, `getLastRefreshedAt`, `getStats` (memoized per region via `utils/nodeStats.js`) and `formatWarsawDate`.
- [`utils/nodeStats.js`](utils/nodeStats.js) - `REDIS_KEYS` plus pure node-stats computation (`getNodeStatus`, `computeStats`) shared by `services/nodeCache.js` and the cronjobs worker.
- [`middlewares/morgan.js`](middlewares/morgan.js) - shared request logger (requires `morgan` from the consuming repo's own dependencies).
- [`database/mongoose.js`](database/mongoose.js) - single Mongoose connection, connected on import.
- [`database/syncIndexes.js`](database/syncIndexes.js) - standalone script that syncs Mongoose indexes for every model in the consuming repo's own `database/models` against the actual state in MongoDB.
- [`middlewares/timeout.js`](middlewares/timeout.js) - factory `({ ms, onTimeout })` for a request timeout (time until the response headers are sent). Exposes `req.signal`, aborted on timeout or client disconnect.
- [`middlewares/rateLimit.js`](middlewares/rateLimit.js) - factory over `express-rate-limit` with a Redis store (`prefix` is required; `redis: false` keeps the counters in memory). Requires `express-rate-limit` and `rate-limit-redis` from the consuming repo.
- [`middlewares/noindex.js`](middlewares/noindex.js) - sets `X-Robots-Tag: noindex`, mounted on `/api`.
- [`utils/seo.js`](utils/seo.js) - `createSeo` (meta data and JSON-LD) and `ORGANIZATIONS`, the only place for organization data.
- [`views/seo-head.ejs`](views/seo-head.ejs) - the `<head>` tags rendered from the `createSeo` result.
- [`utils/sitemap.js`](utils/sitemap.js) - `createSitemap` route handler (cached with a TTL in production) and `escapeXml`.
- [`utils/robots.js`](utils/robots.js) - `createRobots({ allow, disallow })` handler for `/robots.txt`.

## Used by

- [meshcore-profiles/map](https://github.com/meshcore-profiles/map) (mapa.meshcorepolska.org / map.meshcoreprofiles.com)
- [meshcore-profiles/website](https://github.com/meshcore-profiles/website) (meshcoreprofiles.com)
- [meshcore-profiles/cronjobs](https://github.com/meshcore-profiles/cronjobs)
- [meshcore-pl/strona-www](https://github.com/meshcore-pl/strona-www) (meshcorepolska.org)
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
