// Consecutive failed scans before a domain is unverified. Losing the proof or the qualification is a definite answer, so it
// needs fewer confirmations than an error that may be a hiccup on either side (timeout, DNS, 5xx).
const DEFINITE_FAILURES = new Set(['ownershipNotFound', 'takenByOther', 'blocklisted', 'blockedTld', 'blockedBuilder', 'invalidFormat', 'invalidValue', 'foreignRedirect', 'badContentType', 'noHtml', 'tooLittleContent']);
const FAILURE_LIMITS = { definite: 2, transient: 4 };

const failureLimit = key => (DEFINITE_FAILURES.has(key) ? FAILURE_LIMITS.definite : FAILURE_LIMITS.transient);

// `result` is the outcome of verifyWebsite(): `{ ok: true }` or `{ ok: false, key }`
const nextScan = (previous, result, at = new Date()) => (result.ok
	? { at, ok: true, failures: 0 }
	: { at, ok: false, key: result.key, failures: (previous?.failures || 0) + 1 });

// A single failed scan is never enough: the previous result might be a one-off
const shouldRevoke = scan => !scan.ok && scan.failures >= failureLimit(scan.key);

module.exports = { failureLimit, nextScan, shouldRevoke };
