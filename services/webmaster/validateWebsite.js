const axios = require('../axios.js');
const safeRequest = require('./safeRequest.js');
const { dnsResolver, isBlocklisted } = require('./localDns.js');
const { isBlockedTLD, isBlockedBuilder } = require('./blockedDomains.js');
const User = require('../../database/models/user.model.js');

const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const TXT_RECORD_PREFIX = 'mcprofiles-verify';
const VERIFICATION_FILE_PATH = '/.well-known/meshcore-verify.txt';

const CONNECT_ERROR_DETAILS = {
	ECONNABORTED: 'timeout',
	ENOTFOUND: 'dnsNotFound',
	EAI_AGAIN: 'dnsTemporary',
	ERR_FR_TOO_MANY_REDIRECTS: 'tooManyRedirects',
	ERR_CANCELED: 'canceled',
	ERR_BLOCKED_ADDRESS: 'blockedAddress',
};

const stripHtmlText = html => html
	.replace(/<script[\s\S]*?<\/script>/gi, ' ')
	.replace(/<style[\s\S]*?<\/style>/gi, ' ')
	.replace(/<!--[\s\S]*?-->/g, ' ')
	.replace(/<[^>]+>/g, ' ')
	.replace(/&[a-z]+;|&#\d+;/gi, ' ')
	.replace(/\s+/g, ' ')
	.trim();

const rejected = (key, params) => ({ ok: false, key, params });

const initialValidation = async (domain, userId = null, signal) => {
	if (!domain || typeof domain !== 'string') return rejected('invalidValue');

	if (!DOMAIN_REGEX.test(domain)) return rejected('invalidFormat');
	if (isBlockedTLD(domain)) return rejected('blockedTld');
	if (isBlockedBuilder(domain)) return rejected('blockedBuilder');

	const existing = await User.findOne({
		'websites.domain': domain,
		'websites.verified': true,
		_id: { $ne: userId },
	});
	if (existing) return rejected('takenByOther');

	if (await isBlocklisted(domain)) return rejected('blocklisted');

	const httpsUrl = `https://${domain}`;
	try {
		const res = await axios.get(httpsUrl, {
			...safeRequest,
			signal,
			timeout: 7000,
			validateStatus: () => true,
			headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
		});

		if (res.status >= 400) return rejected('badStatus', { url: httpsUrl, status: res.status });

		const contentType = res.headers['content-type'] || '';
		if (!(/^text\/html\b/).test(contentType)) return rejected('badContentType', { url: httpsUrl, type: contentType });

		const html = res.data;
		if (typeof html !== 'string' || !(/<html[\s>]/i).test(html)) return rejected('noHtml', { url: httpsUrl });

		const bodyLen = stripHtmlText(html).length;
		if (bodyLen < 100) return rejected('tooLittleContent', { url: httpsUrl, length: bodyLen });

		return { ok: true };
	} catch (err) {
		console.error(err);
		return rejected('connectFailed', {
			url: httpsUrl,
			code: err.code || 'NO_CODE',
			detail: CONNECT_ERROR_DETAILS[err.code] || (err.response ? 'http' : 'unknown'),
			status: err.response?.status,
		});
	}
};

const verifyDomainOwnership = async (domain, token, signal) => {
	const records = await dnsResolver.resolveTxt(`${TXT_RECORD_PREFIX}.${domain}`).catch(() => []);
	if (records.flat().includes(token)) return { ok: true, method: 'dns' };

	const url = `https://${domain}${VERIFICATION_FILE_PATH}?ts=${Date.now()}`;
	const res = await axios.get(url, {
		...safeRequest,
		signal,
		timeout: 9000,
		validateStatus: () => true,
		headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
	}).catch(() => null);

	if (res?.status === 200 && typeof res.data === 'string' && res.data.trim() === token) return { ok: true, method: 'file' };

	return rejected('ownershipNotFound', { record: `${TXT_RECORD_PREFIX}.${domain}`, path: VERIFICATION_FILE_PATH });
};

// Whole check a verified domain has to keep passing: it must still qualify and the owner's token must still be published
const verifyWebsite = async ({ domain, token, userId = null, signal }) => {
	const qualification = await initialValidation(domain, userId, signal);
	return qualification.ok ? verifyDomainOwnership(domain, token, signal) : qualification;
};

module.exports = { initialValidation, verifyDomainOwnership, verifyWebsite, DOMAIN_REGEX };
