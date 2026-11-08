const { Resolver } = require('node:dns/promises');

// Own resolvers with the Sefinek-Blocklist-Collection: a blocked domain resolves to 0.0.0.0 (A) or :: (AAAA).
const LOCAL_DNS = [
	'10.0.0.14', '10.0.0.15',
	'2a01:11bf:4404:9005:f639:9ff:fe4c:3943', '2a01:11bf:4404:9005:be24:11ff:fee8:845f',
];

const dnsResolver = new Resolver({ timeout: 3000, tries: 2 });
dnsResolver.setServers(process.env.LOCAL_DNS_SERVERS ? process.env.LOCAL_DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean) : LOCAL_DNS);

// Fails open: an unreachable resolver must not block verification, so lookup errors count as "not listed".
const isBlocklisted = async domain => {
	const [records4, records6] = await Promise.all([
		dnsResolver.resolve4(domain).catch(() => []),
		dnsResolver.resolve6(domain).catch(() => []),
	]);

	return records4.includes('0.0.0.0') || records6.includes('::');
};

module.exports = { dnsResolver, isBlocklisted };
