import fs from 'node:fs';
import path from 'node:path';
import i18next from 'i18next';
import { LanguageDetector } from 'i18next-http-middleware';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, getLangCookie } from '../utils/languageResolver.js';

const LOCALES_DIR = path.join(import.meta.dirname, '..', '..', 'locales');

// Not every consuming repo translates every language in AVAILABLE_LANGUAGES (e.g. a Polish-only
// site has no locales/en/) - only load/support the ones that actually have a locales/<lang>/ dir.
const SUPPORTED = [...AVAILABLE_LANGUAGES].filter(lng => fs.existsSync(path.join(LOCALES_DIR, lng)));
const FALLBACK_LANGUAGE = SUPPORTED.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : SUPPORTED[0];

const NAMESPACES = fs.readdirSync(path.join(LOCALES_DIR, FALLBACK_LANGUAGE))
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
		if (cookieLang && SUPPORTED.includes(cookieLang)) return cookieLang;

		const siteDefault = req.site?.defaultLanguage;
		return siteDefault && SUPPORTED.includes(siteDefault) ? siteDefault : FALLBACK_LANGUAGE;
	},
});

i18next
	.use(detector)
	.init({
		initImmediate: false,
		resources,
		fallbackLng: FALLBACK_LANGUAGE,
		supportedLngs: SUPPORTED,
		ns: NAMESPACES,
		defaultNS: 'common',
		detection: { order: ['forced'], caches: false },
		interpolation: { escapeValue: false },
		returnEmptyString: false,
	});

export { i18next, resources, NAMESPACES, SUPPORTED, FALLBACK_LANGUAGE };

