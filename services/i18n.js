const fs = require('node:fs');
const path = require('node:path');
const i18next = require('i18next');
const { LanguageDetector } = require('i18next-http-middleware');
const { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, getLangCookie } = require('../utils/languageResolver.js');

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales');
const SUPPORTED = [...AVAILABLE_LANGUAGES];

const NAMESPACES = fs.readdirSync(path.join(LOCALES_DIR, DEFAULT_LANGUAGE))
	.filter(file => file.endsWith('.json'))
	.map(file => file.slice(0, -5));

const resources = {};
for (const lng of SUPPORTED) {
	resources[lng] = {};
	for (const ns of NAMESPACES) {
		resources[lng][ns] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lng, `${ns}.json`), 'utf8'));
	}
}

const detector = new LanguageDetector();
detector.addDetector({
	name: 'forced',
	lookup: req => {
		if (req.forcedLanguage) return req.forcedLanguage;

		const cookieLang = getLangCookie(req);
		if (cookieLang && AVAILABLE_LANGUAGES.has(cookieLang)) return cookieLang;

		return DEFAULT_LANGUAGE;
	},
});

i18next
	.use(detector)
	.init({
		initImmediate: false,
		resources,
		fallbackLng: DEFAULT_LANGUAGE,
		supportedLngs: SUPPORTED,
		ns: NAMESPACES,
		defaultNS: 'common',
		detection: { order: ['forced'], caches: false },
		interpolation: { escapeValue: false },
		returnEmptyString: false,
	});

module.exports = { i18next, resources, NAMESPACES };
