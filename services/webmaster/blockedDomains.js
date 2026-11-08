const BLOCKED_BUILDERS = [
	'8b.io', 'bandzoogle.com', 'bookmark.com',
	'breezi.com', 'brizy.site', 'cabanova.com',
	'cabanova.net', 'cargo.site', 'carrd.co',
	'crevado.com', 'doodlekit.com', 'dorik.io',
	'editorx.com', 'flazio.com', 'format.com',
	'homesteadcloud.com', 'hpage.com', 'imcreator.com',
	'instapage.com', 'jimdo.com', 'journoportfolio.com',
	'landerapp.com', 'launchrock.com', 'leadpages.co',
	'mobirisesite.com', 'moonfruit.com', 'mozello.com',
	'myportfolio.com', 'mystrikingly.com', 'onepager.com',
	'pagecloud.com', 'pagexl.com', 'pixpa.com',
	'populr.me', 'portfoliobox.net', 'showit.co',
	'simplesite.com', 'site123.com', 'sitebuilder.com',
	'sitemakerlive.com', 'siter.io', 'siterubix.com',
	'sitey.com', 'snappages.com', 'squarespace-cdn.com',
	'squarespace.com', 'strikingly.com', 'strikinglycdn.com',
	'tilda.ws', 'typedream.com', 'ulcraft.com',
	'unbouncepages.com', 'vsble.me', 'webador.com',
	'webflow.io', 'weblium.com', 'webnode.com',
	'webstarts.com', 'webwavecms.com', 'webydo.com',
	'weebly.com', 'wix.com', 'wixsite.com',
	'wixstatic.com', 'yolasite.com', 'zyro.com',
];

const BLOCKED_TLDS = [
	'.tk', '.ml', '.cf', '.gq', '.ga',
	'.local', '.localhost', '.test', '.example', '.invalid', '.onion', '.internal', '.lan', '.home', '.corp', '.arpa',
];

module.exports = {
	isBlockedBuilder(domain) {
		return BLOCKED_BUILDERS.some(builder => {
			if (!domain.endsWith(builder)) return false;

			const parts = domain.split('.');
			const builderParts = builder.split('.');
			return parts.length > builderParts.length;
		});
	},

	isBlockedTLD(domain) {
		return BLOCKED_TLDS.some(tld => domain.endsWith(tld));
	},
};
