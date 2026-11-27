const LATE_METHODS = ['set', 'setHeader', 'setHeaders', 'removeHeader', 'send', 'json', 'render', 'redirect', 'end', 'write', 'sendFile', 'download'];

// Exposes `req.signal` (shadowing Node's getter, which would not abort on the timeout), aborted on timeout or when the client goes away,
// so slow work (outbound HTTP, upload pipeline) can stop instead of finishing for nobody.
export default ({ ms = 15 * 1000, onTimeout }) => (req, res, next) => {
	const controller = new AbortController();
	Object.defineProperty(req, 'signal', { value: controller.signal, configurable: true });

	const timer = setTimeout(() => {
		if (res.headersSent) return;

		controller.abort(new Error('Request timed out'));
		// A handler that finishes after the 503 would otherwise write to a closed response. The methods are disabled as soon as
		// the 503 calls `end`: `res.render` sends it asynchronously, and waiting for `finish` would leave a gap for late writes.
		const { end } = res;
		res.end = (...args) => {
			const result = end.apply(res, args);
			LATE_METHODS.forEach(method => { res[method] = () => res; });
			return result;
		};
		onTimeout(res);
	}, ms);

	res.once('close', () => {
		clearTimeout(timer);
		if (!res.writableFinished) controller.abort(new Error('Client disconnected'));
	});
	next();
};
