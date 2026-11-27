const MAX_URLS = 50000;
const MAX_BYTES = 49 * 1024 * 1024;
const MAX_URL_LENGTH = 2048;
const DEFAULT_TTL = 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

const HEADERS = {
	'Content-Type': 'application/xml; charset=utf-8',
	'Cache-Control': 'public, max-age=3600',
	'Content-Security-Policy': 'default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; connect-src \'self\'',
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&apos;' };
const escapeXml = str => String(str).replace(/[&<>"']/g, c => ESCAPES[c]);

// lastmod must be a real, past modification time (W3C datetime); anything else is dropped instead of guessed
const toDate = value => {
	if (value === null || value === undefined || value === '') return null;
	const date = value instanceof Date ? value : new Date(value);
	const time = date.getTime();
	return Number.isNaN(time) || time > Date.now() ? null : date;
};

// Entry: { loc, lastmod?, images?: [{ loc, title? }], alternates?: [{ hreflang, href }] }. loc is a path ("/about") or an absolute URL; lastmod is a Date, timestamp or date string.
// changefreq and priority are intentionally unsupported: Google ignores both. Returns { xml, lastmod } (lastmod = newest entry, or null).
const build = (domain, entries) => {
	const base = domain.replace((/\/$/), '');
	const absolute = value => ((/^https?:\/\//i).test(value) ? value : `${base}${value.startsWith('/') ? '' : '/'}${value}`);
	const seen = new Set();
	const urls = [];
	let hasImages = false;
	let hasAlternates = false;
	let newest = null;
	let bytes = 0;
	let truncated = false;

	for (const { loc, lastmod, images, alternates } of entries) {
		const url = absolute(loc);
		if (url.length > MAX_URL_LENGTH || seen.has(url)) continue;

		const date = toDate(lastmod);
		const imageTags = (images || []).map(img => `<image:image><image:loc>${escapeXml(absolute(img.loc))}</image:loc>${img.title ? `<image:title>${escapeXml(img.title)}</image:title>` : ''}</image:image>`).join('');
		const alternateTags = (alternates || []).map(alt => `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(absolute(alt.href))}"/>`).join('');
		const tag = `<url><loc>${escapeXml(url)}</loc>${date ? `<lastmod>${date.toISOString()}</lastmod>` : ''}${alternateTags}${imageTags}</url>`;

		bytes += Buffer.byteLength(tag) + 1;
		if (urls.length >= MAX_URLS || bytes > MAX_BYTES) {
			truncated = true;
			break;
		}

		seen.add(url);
		urls.push(tag);
		if (imageTags) hasImages = true;
		if (alternateTags) hasAlternates = true;
		if (date && (!newest || date > newest)) newest = date;
	}

	if (truncated) console.warn(`[sitemap] ${base}: truncated at ${urls.length} URLs (limit ${MAX_URLS} URLs / 50 MB per file); split it into a sitemap index`);

	const ns = `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''}${hasAlternates ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ''}`;
	return { xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${ns}>\n${urls.join('\n')}\n</urlset>\n`, lastmod: newest };
};

// getEntries(domain, req) may be sync or async. The domain is res.locals.domain (multi-site apps) or app.locals.domain. In production the result is
// cached per domain: the first request waits for the build, later ones get the cached copy instantly and an expired copy is served stale while a
// single background rebuild runs. Express adds ETag and answers 304 on If-None-Match / If-Modified-Since (Last-Modified = newest lastmod),
// HEAD works through the route.
const createSitemap = (getEntries, { ttl = DEFAULT_TTL } = {}) => {
	const cache = new Map();

	const refresh = (domain, req, state) => {
		state.pending ??= Promise.try(getEntries, domain, req)
			.then(entries => {
				Object.assign(state, build(domain, entries), { at: Date.now() });
			})
			.finally(() => {
				state.pending = null;
			});

		return state.pending;
	};

	const get = async (domain, req) => {
		if (!isProd) return build(domain, await getEntries(domain, req));

		let state = cache.get(domain);
		if (!state) cache.set(domain, state = { xml: null, lastmod: null, at: 0, pending: null });

		if (!state.xml) await refresh(domain, req, state);
		else if (Date.now() - state.at >= ttl) refresh(domain, req, state).catch(err => console.error(`[sitemap] ${domain}: ${err.message}`));

		return state;
	};

	return async (req, res, next) => {
		try {
			const { xml, lastmod } = await get(res.locals?.domain ?? req.app.locals.domain, req);
			res.set(HEADERS);
			if (lastmod) res.set('Last-Modified', lastmod.toUTCString());
			res.send(xml);
		} catch (err) {
			next(err);
		}
	};
};

export { createSitemap, escapeXml };
