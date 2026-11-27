const CONTACT_EMAIL = 'contact@sefinek.net';
const INDEXABLE_ROBOTS = 'max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, nofollow';

const ORGANIZATIONS = {
	pl: {
		name: 'MeshCore Polska',
		description: 'Pierwsza ogólnopolska społeczność skupiona wokół sieci MeshCore, czyli komunikacji radiowej LoRa działającej bez internetu i GSM.',
		url: 'https://meshcorepolska.org',
		logo: 'https://meshcorepolska.org/images/brand/logo-3-192.jpg',
		contactPath: '/kontakt',
		language: 'pl',
		areaServed: { '@type': 'Country', name: 'Polska' },
		sameAs: ['https://discord.com/invite/evq32hatT3', 'https://github.com/meshcore-pl'],
		image: { url: 'https://meshcorepolska.org/images/brand/banner-og.jpg', alt: 'MeshCore Polska: ogólnopolska społeczność sieci mesh', width: 1200, height: 675 },
	},
	global: {
		name: 'MeshCore Profiles',
		url: 'https://meshcoreprofiles.com',
		logo: 'https://meshcoreprofiles.com/images/logo/android-chrome-192x192.png',
		contactPath: '/contact',
		language: 'en',
		sameAs: ['https://github.com/meshcore-profiles'],
		image: { url: 'https://meshcoreprofiles.com/images/banner.png', alt: 'MeshCore Profiles', width: 1200, height: 630 },
	},
};

const serializeJsonLd = data => JSON.stringify(data).replace(/</g, '\\u003c');

const buildOrganization = organization => ({
	'@type': 'Organization',
	'@id': `${organization.url}/#organization`,
	name: organization.name,
	description: organization.description,
	url: `${organization.url}/`,
	logo: { '@type': 'ImageObject', url: organization.logo, width: 192, height: 192 },
	email: CONTACT_EMAIL,
	contactPoint: {
		'@type': 'ContactPoint',
		contactType: 'customer support',
		email: CONTACT_EMAIL,
		url: `${organization.url}${organization.contactPath}`,
		availableLanguage: organization.language,
	},
	areaServed: organization.areaServed,
	sameAs: organization.sameAs,
});

const buildQuestions = faq => faq.map(({ question, answerHtml }) => ({
	'@type': 'Question',
	name: question,
	acceptedAnswer: { '@type': 'Answer', text: answerHtml },
}));

const buildItemList = (domain, items) => ({
	'@type': 'ItemList',
	numberOfItems: items.length,
	itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: `${domain}${item.url}` })),
});

const buildSchema = ({ domain, url, organization, site, language, title, description, image, pageType, aboutOrganization, mainEntity, dateCreated, itemList, faq, breadcrumbs, article, app }) => {
	const organizationNode = buildOrganization(organization);
	const publisher = { '@id': organizationNode['@id'] };
	const websiteId = `${domain}/#website`;
	const webPageId = `${url}#webpage`;
	const breadcrumbId = breadcrumbs?.length ? `${url}#breadcrumb` : undefined;
	const appId = app ? `${domain}${app.url}#webapp` : undefined;
	const hasFaq = Boolean(faq?.length);

	let entity = mainEntity;
	if (hasFaq) entity = buildQuestions(faq);
	else if (!entity && itemList?.length) entity = buildItemList(domain, itemList);
	else if (!entity && appId) entity = { '@id': appId };

	const graph = [
		organizationNode,
		{
			'@type': 'WebSite',
			'@id': websiteId,
			name: site.schemaName || site.name,
			description: site.description,
			url: `${domain}/`,
			inLanguage: site.languages || language,
			publisher,
		},
		{
			'@type': hasFaq ? [pageType, 'FAQPage'] : pageType,
			'@id': webPageId,
			url,
			name: title,
			description,
			inLanguage: language,
			isPartOf: { '@id': websiteId },
			about: aboutOrganization ? publisher : undefined,
			primaryImageOfPage: { '@type': 'ImageObject', url: image.url },
			breadcrumb: breadcrumbId && { '@id': breadcrumbId },
			dateCreated,
			datePublished: article?.datePublished,
			dateModified: article?.dateModified,
			mainEntity: entity,
		},
	];

	if (breadcrumbId) {
		graph.push({
			'@type': 'BreadcrumbList',
			'@id': breadcrumbId,
			itemListElement: breadcrumbs.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: `${domain}${item.url}` })),
		});
	}

	if (article) {
		graph.push({
			'@type': article.type || ['Article', 'TechArticle'],
			'@id': `${url}#article`,
			headline: article.title || title,
			description,
			image: image.url,
			url,
			inLanguage: language,
			datePublished: article.datePublished,
			dateModified: article.dateModified,
			articleSection: article.section,
			keywords: article.tags?.length ? article.tags : undefined,
			author: article.author || publisher,
			publisher,
			translator: article.sourceUrl ? publisher : undefined,
			translationOfWork: article.sourceUrl ? { '@type': article.sourceType || 'BlogPosting', '@id': article.sourceUrl, url: article.sourceUrl, inLanguage: 'en', author: article.author } : undefined,
			isPartOf: { '@id': webPageId },
			mainEntityOfPage: { '@id': webPageId },
		});
	}

	if (app) {
		graph.push({
			'@type': 'WebApplication',
			'@id': appId,
			name: app.name,
			description: app.description,
			url: `${domain}${app.url}`,
			image: image.url,
			applicationCategory: 'UtilitiesApplication',
			operatingSystem: 'Any',
			browserRequirements: app.requirements,
			inLanguage: language,
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: app.currency },
			publisher,
		});
	}

	return { '@context': 'https://schema.org', '@graph': graph };
};

const createSeo = ({
	domain, organization, site, language = 'pl-PL', locale = 'pl_PL', localeAlternates = [], title, description, keywords, canonical, alternates = [],
	noindex, nonce, ogType, image = organization.image, pageType = 'WebPage', aboutOrganization, mainEntity, dateCreated, itemList, faq, breadcrumbs, article, app,
}) => {
	const indexable = !noindex && Boolean(canonical);
	const url = indexable ? `${domain}${canonical}` : undefined;
	const dated = article ? { ...article, dateModified: article.dateModified || article.datePublished } : undefined;
	const schema = indexable
		? buildSchema({ domain, url, organization, site, language, title, description, image, pageType, aboutOrganization, mainEntity, dateCreated, itemList, faq, breadcrumbs, article: dated, app })
		: null;

	return {
		title,
		description,
		keywords,
		author: dated ? dated.author?.name || organization.name : undefined,
		robots: indexable ? INDEXABLE_ROBOTS : NOINDEX_ROBOTS,
		url,
		alternates: indexable ? alternates : [],
		siteName: site.name,
		locale,
		localeAlternates,
		ogType: ogType || (dated ? 'article' : 'website'),
		image,
		article: dated,
		nonce,
		jsonLd: schema && serializeJsonLd(schema),
	};
};

export { createSeo, ORGANIZATIONS };
