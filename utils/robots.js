const INTERNAL_PATHS = ['/cdn-cgi', '/cdn-cgi/', '/.well-known', '/.well-known/'];

const buildRobots = (domain, { allow = [], disallow = [] } = {}) => [
	'User-agent: *',
	...allow.map(path => `Allow: ${path}`),
	...[...disallow, ...INTERNAL_PATHS].map(path => `Disallow: ${path}`),
	'',
	`Sitemap: ${domain}/sitemap.xml`,
	'',
].join('\n');

const createRobots = options => (req, res) => {
	res.set('Cache-Control', 'public, max-age=3600');
	res.type('text/plain').send(buildRobots(res.locals.domain ?? req.app.locals.domain, options));
};

export { createRobots, buildRobots };
