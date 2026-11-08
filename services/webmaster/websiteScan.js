const FAILURE_LIMIT = 3;

// `result` is the outcome of verifyWebsite(): `{ ok: true }` or `{ ok: false, key }`
const nextScan = (previous, result, at = new Date()) => (result.ok
	? { at, ok: true, failures: 0 }
	: { at, ok: false, key: result.key, failures: (previous?.failures || 0) + 1 });

// A single failed scan is not enough: timeouts and DNS hiccups must not hide a domain
const shouldRevoke = scan => !scan.ok && scan.failures >= FAILURE_LIMIT;

module.exports = { FAILURE_LIMIT, nextScan, shouldRevoke };
