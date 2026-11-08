const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const BLOCKED = new net.BlockList();
[
	['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
	['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([address, prefix]) => BLOCKED.addSubnet(address, prefix, 'ipv4'));
[['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]].forEach(([address, prefix]) => BLOCKED.addSubnet(address, prefix, 'ipv6'));

const MAPPED_IPV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

const isBlockedAddress = address => {
	const mapped = MAPPED_IPV4.exec(address);
	if (mapped) return BLOCKED.check(mapped[1], 'ipv4');

	const family = net.isIPv6(address) ? 'ipv6' : 'ipv4';
	return BLOCKED.check(address, family);
};

const blockedError = hostname => Object.assign(new Error(`Blocked address for ${hostname}`), { code: 'ERR_BLOCKED_ADDRESS' });

// Validating at connect time (not before) closes the DNS rebinding window between check and request.
const safeLookup = (hostname, options, callback) => {
	dns.lookup(hostname, options, (err, address, family) => {
		if (err) return callback(err);

		const list = Array.isArray(address) ? address : [{ address, family }];
		if (list.some(entry => isBlockedAddress(entry.address))) return callback(blockedError(hostname));

		callback(null, address, family);
	});
};

const beforeRedirect = options => {
	const host = String(options.hostname).replace(/^\[|\]$/g, '');
	const port = options.port ? String(options.port) : '443';
	if (options.protocol !== 'https:' || port !== '443') throw blockedError(host);
	// IP literals skip DNS lookup, so they have to be checked here
	if (net.isIP(host) && isBlockedAddress(host)) throw blockedError(host);
};

module.exports = {
	httpAgent: new http.Agent({ lookup: safeLookup }),
	httpsAgent: new https.Agent({ lookup: safeLookup }),
	beforeRedirect,
	maxRedirects: 1,
};
