const LANGUAGES = [
	{ code: 'en', name: 'English', htmlLang: 'en', ogLocale: 'en_US' },
	{ code: 'pl', name: 'Polski', htmlLang: 'pl', ogLocale: 'pl_PL' },
];

const LANGUAGE_MAP = new Map(LANGUAGES.map(lang => [lang.code, lang]));
const AVAILABLE_LANGUAGES = new Set(LANGUAGE_MAP.keys());
const DEFAULT_LANGUAGE = 'en';

const prefixFor = language =>
	language && language !== DEFAULT_LANGUAGE && AVAILABLE_LANGUAGES.has(language) ? `/${language}` : '';

const langPath = (language, urlPath) => `${prefixFor(language)}${urlPath === '/' ? '' : urlPath}` || '/';

const detectLanguagePrefix = url => {
	for (const language of AVAILABLE_LANGUAGES) {
		if (language === DEFAULT_LANGUAGE) continue;

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
	isLanguageAgnosticPath,
};
