const LANGUAGES = [
	{ code: 'en', name: 'English', htmlLang: 'en', ogLocale: 'en_US' },
	{ code: 'pl', name: 'Polski', htmlLang: 'pl', ogLocale: 'pl_PL' },
];

const LANGUAGE_MAP = new Map(LANGUAGES.map(lang => [lang.code, lang]));
const AVAILABLE_LANGUAGES = new Set(LANGUAGE_MAP.keys());
const DEFAULT_LANGUAGE = 'en';

// defaultLanguage is per-site (req.site.defaultLanguage) - callers always pass it explicitly;
// the module-level DEFAULT_LANGUAGE is only a fallback for the rare caller that doesn't have a site yet.
const prefixFor = (language, defaultLanguage = DEFAULT_LANGUAGE) =>
	language && language !== defaultLanguage && AVAILABLE_LANGUAGES.has(language) ? `/${language}` : '';

const langPath = (language, urlPath, defaultLanguage = DEFAULT_LANGUAGE) =>
	`${prefixFor(language, defaultLanguage)}${urlPath === '/' ? '' : urlPath}` || '/';

const detectLanguagePrefix = (url, defaultLanguage = DEFAULT_LANGUAGE) => {
	for (const language of AVAILABLE_LANGUAGES) {
		if (language === defaultLanguage) continue;

		const prefix = `/${language}`;
		if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
			let rest = url.slice(prefix.length);
			if (rest === '') rest = '/';
			else if (rest[0] === '?') rest = `/${rest}`;
			return { language, url: rest };
		}
	}

	return null;
};

const getLangCookie = req => {
	const header = req.headers.cookie;
	if (!header) return null;

	const match = header.match(/(?:^|;\s*)lang=([^;]+)/);
	return match ? match[1] : null;
};

// Cookie wins when valid; otherwise picks the highest-q supported language from Accept-Language.
// Returns null when nothing usable was found - the caller falls back to the site's own default.
const negotiatePreferred = (cookie, acceptLanguageHeader) => {
	if (cookie && AVAILABLE_LANGUAGES.has(cookie)) return cookie;
	if (!acceptLanguageHeader) return null;

	const ranked = acceptLanguageHeader.split(',').map(part => {
		const [tag, qPart] = part.trim().split(';q=');
		return { tag: tag.trim().toLowerCase(), q: qPart ? parseFloat(qPart) : 1 };
	}).sort((a, b) => b.q - a.q);

	for (const { tag } of ranked) {
		const base = tag.split('-')[0];
		if (AVAILABLE_LANGUAGES.has(base)) return base;
	}

	return null;
};

const LANGUAGE_AGNOSTIC_PATHS = new Set(['/robots.txt', '/sitemap.xml', '/manifest.json']);
const isLanguageAgnosticPath = path => LANGUAGE_AGNOSTIC_PATHS.has(path);

module.exports = {
	LANGUAGES,
	LANGUAGE_MAP,
	AVAILABLE_LANGUAGES,
	DEFAULT_LANGUAGE,
	prefixFor,
	langPath,
	detectLanguagePrefix,
	getLangCookie,
	negotiatePreferred,
	isLanguageAgnosticPath,
};
