const axios = require('../axios.js');
const safeRequest = require('./safeRequest.js');
const { dnsResolver, isBlocklisted } = require('./localDns.js');
const { isBlockedTLD, isBlockedBuilder } = require('./blockedDomains.js');
const User = require('../../database/models/user.model.js');

const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Underscore-prefixed label (RFC 8552), like ACME's _acme-challenge; the old label stays accepted for domains verified before it
const TXT_LABELS = ['_mcprofiles-verify', 'mcprofiles-verify'];
const TXT_VALUE_PREFIX = 'mcprofiles-site-verification=';
const VERIFICATION_FILE_PATH = '/.well-known/meshcore-verify.txt';

const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 2048;
const NO_CACHE = { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' };
const ABSENT_RECORD_CODES = new Set(['ENODATA', 'ENOTFOUND']);

const CONNECT_ERROR_DETAILS = {
	ECONNABORTED: 'timeout',
	ENOTFOUND: 'dnsNotFound',
	EAI_AGAIN: 'dnsTemporary',
	ERR_FR_TOO_MANY_REDIRECTS: 'tooManyRedirects',
	ERR_FR_MAX_CONTENT_LENGTH_EXCEEDED: 'tooLarge',
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

const bareHost = host => host.toLowerCase().replace(/^www\./, '');

// The response has to come from the domain itself (apex and www count as one site), not from wherever it redirects
const servedBy = (res, domain) => {
	try {
		const url = res.request?.res?.responseUrl || res.config.url;
		return bareHost(new URL(url).hostname) === bareHost(domain);
	} catch {
		return false;
	}
};

const matchesToken = (value, token) => {
	const trimmed = String(value).trim();
	return trimmed === token || trimmed === `${TXT_VALUE_PREFIX}${token}`;
};

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
			maxContentLength: MAX_PAGE_BYTES,
			responseType: 'text',
			validateStatus: () => true,
			headers: NO_CACHE,
		});

		if (res.status >= 400) return rejected('badStatus', { url: httpsUrl, status: res.status });
		if (!servedBy(res, domain)) return rejected('foreignRedirect', { url: httpsUrl });

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

// A missing record is an answer; a resolver failure (SERVFAIL, timeout) is not, and must not look like the owner removed it
const lookupTxt = async name => {
	try {
		const records = await dnsResolver.resolveTxt(name);
		return { records: records.map(chunks => chunks.join('')) };
	} catch (err) {
		return ABSENT_RECORD_CODES.has(err.code) ? { records: [] } : { failed: true };
	}
};

const fetchVerificationFile = async (domain, signal) => {
	try {
		const res = await axios.get(`https://${domain}${VERIFICATION_FILE_PATH}?ts=${Date.now()}`, {
			...safeRequest,
			signal,
			timeout: 9000,
			maxContentLength: MAX_FILE_BYTES,
			responseType: 'text',
			transformResponse: [data => data],
			validateStatus: () => true,
			headers: NO_CACHE,
		});

		return { res };
	} catch {
		return { failed: true };
	}
};

const verifyDomainOwnership = async (domain, token, signal) => {
	const [dnsAnswers, file] = await Promise.all([
		Promise.all(TXT_LABELS.map(label => lookupTxt(`${label}.${domain}`))),
		fetchVerificationFile(domain, signal),
	]);

	if (dnsAnswers.some(answer => answer.records?.some(record => matchesToken(record, token)))) return { ok: true, method: 'dns' };

	const { res } = file;
	if (res?.status === 200 && servedBy(res, domain) && typeof res.data === 'string' && matchesToken(res.data, token)) return { ok: true, method: 'file' };

	const params = { record: `${TXT_LABELS[0]}.${domain}`, path: VERIFICATION_FILE_PATH };
	if (file.failed || dnsAnswers.some(answer => answer.failed)) return rejected('verificationUnavailable', params);

	return rejected('ownershipNotFound', params);
};

// Whole check a verified domain has to keep passing: it must still qualify and the owner's token must still be published
const verifyWebsite = async ({ domain, token, userId = null, signal }) => {
	const qualification = await initialValidation(domain, userId, signal);
	return qualification.ok ? verifyDomainOwnership(domain, token, signal) : qualification;
};

module.exports = { initialValidation, verifyDomainOwnership, verifyWebsite, DOMAIN_REGEX, TXT_LABELS, TXT_VALUE_PREFIX, VERIFICATION_FILE_PATH };
