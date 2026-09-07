const { isIP, Socket } = require('node:net');
const crypto = require('node:crypto');

const { TCPDATA_HOST, TCPDATA_PORT, NODE_ENV } = process.env;
if (!TCPDATA_HOST || !TCPDATA_PORT) {
	console.error('FATAL: TCPDATA_HOST and TCPDATA_PORT environment variables are required');
	process.exit(1);
}

const INITIAL_RECONNECT_DELAY = 2000, MAX_RECONNECT_DELAY = 40000, TIMEOUT = 6000, MAX_QUEUE_SIZE = 1000, MAX_BUFFER_SIZE = 100 * 1024;
const pendingRequests = new Map();
let tcpSocket, buffer = '', isConnected = false, isWritable = true, reconnectDelay = INITIAL_RECONNECT_DELAY, reconnectTimer = null;

const failPendingRequests = () => {
	if (pendingRequests.size === 0) return;
	for (const request of pendingRequests.values()) {
		clearTimeout(request.timeout);
		request.resolve(null);
	}
	pendingRequests.clear();
};

const connectTCP = () => {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	tcpSocket = new Socket();
	tcpSocket.setKeepAlive(true);
	tcpSocket.setNoDelay(true);

	tcpSocket.connect(TCPDATA_PORT, TCPDATA_HOST, () => {
		console.log(`Connected to TCP data service at ${TCPDATA_HOST}:${TCPDATA_PORT}`);
		isConnected = true;
		isWritable = true;
		reconnectDelay = INITIAL_RECONNECT_DELAY;
	});

	tcpSocket.on('data', data => {
		buffer += data.toString();

		if (buffer.length > MAX_BUFFER_SIZE) {
			console.error('Buffer overflow detected, reconnecting...');
			tcpSocket.destroy();
			return;
		}

		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			try {
				const response = JSON.parse(trimmed);
				const requestId = response.__reqId;
				if (!requestId) {
					console.warn('Received response without request ID:', JSON.stringify(response));
					continue;
				}

				const request = pendingRequests.get(requestId);
				if (!request) continue;

				pendingRequests.delete(requestId);
				clearTimeout(request.timeout);

				delete response.__reqId;
				request.resolve(response);
			} catch (err) {
				console.error('Failed to parse TCP response:', trimmed, err.message);
			}
		}
	});

	tcpSocket.on('error', err => {
		console.error('TCP data service error:', err.message);
		isConnected = false;
		isWritable = false;
		failPendingRequests();
	});

	tcpSocket.on('close', () => {
		isConnected = false;
		isWritable = false;
		failPendingRequests();

		if (reconnectDelay >= MAX_RECONNECT_DELAY) {
			console.warn(`TCP reconnect delay reached maximum (${MAX_RECONNECT_DELAY}ms) - connection issues may persist`);
		}

		reconnectTimer = setTimeout(connectTCP, reconnectDelay);
		reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
	});

	tcpSocket.on('drain', () => {
		isWritable = true;
	});
};

const cleanup = () => {
	if (tcpSocket && !tcpSocket.destroyed) tcpSocket.destroy();
	if (reconnectTimer) clearTimeout(reconnectTimer);
	failPendingRequests();
	process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

connectTCP();

/**
 * Send a request to the TCP server with unique ID for request-response matching
 * @private
 * @param {string} command - TCP command (e.g., 'geo_check:8.8.8.8', 'stats:', etc.)
 * @returns {Promise<object|null>} Parsed JSON response or null on error/timeout
 */
const sendRequest = command => new Promise(resolve => {
	if (!isConnected || !isWritable) return resolve(null);

	if (typeof command !== 'string') {
		console.error('Invalid TCP command: must be a string');
		return resolve(null);
	}

	if (pendingRequests.size >= MAX_QUEUE_SIZE) {
		console.warn(`TCP request queue full (${MAX_QUEUE_SIZE}), rejecting request`);
		return resolve(null);
	}

	const requestId = crypto.randomBytes(8).toString('hex');
	const requestObj = {
		resolve,
		timeout: setTimeout(() => {
			if (pendingRequests.delete(requestId)) resolve(null);
		}, TIMEOUT),
	};

	pendingRequests.set(requestId, requestObj);

	try {
		const flushed = tcpSocket.write(`${command}|${requestId}\n`);
		if (!flushed) isWritable = false;
	} catch (err) {
		console.error('TCP write error:', err.message);
		pendingRequests.delete(requestId);
		clearTimeout(requestObj.timeout);
		resolve(null);
	}
});

const DEV_FALLBACK_IP = '79.186.2.0';
const isPrivateIp = ip => (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i).test(ip);

/**
 * Performs GeoIP lookup for the given IP address
 * @param {string} ip - IP address to lookup
 * @returns {Promise<object|null>} GeoIP data or null if invalid/not found
 * @example
 * const data = await tcpClient.geoCheck('8.8.8.8');
 * // { success: true, country: 'US', ... }
 */
const geoCheck = ip => {
	if (!ip || !isIP(ip)) return Promise.resolve(null);
	const target = (NODE_ENV === 'development' && isPrivateIp(ip)) ? DEV_FALLBACK_IP : ip;
	return sendRequest(`geo_check:${encodeURIComponent(target)}`);
};

/**
 * Checks if email domain is in disposable/temporary email blacklist
 * @param {string} email - Email address to validate
 * @returns {Promise<object|null>} Validation result or null
 * @example
 * const result = await tcpClient.checkTempEmail('user@tempmail.com');
 * // { success: true, email: '...', domain: '...', blacklisted: true }
 */
const checkTempEmail = email => {
	if (!email || typeof email !== 'string') return Promise.resolve(null);
	return sendRequest(`temp_emails:${encodeURIComponent(email.trim())}`);
};

/**
 * Checks if IP address belongs to a known legitimate bot
 * @param {string} ip - IP address to check
 * @returns {Promise<object|null>} Bot information or null
 * @example
 * const result = await tcpClient.checkGoodBot('3.12.251.153');
 * // { success: true, ip: '...', whitelisted: true, name: 'Googlebot', source: '...' }
 */
const checkGoodBot = ip => {
	if (!ip || !isIP(ip)) return Promise.resolve(null);
	return sendRequest(`good_bots:${encodeURIComponent(ip)}`);
};

/**
 * Checks if text contains any forbidden/banned words (with leet speak support and automatic censoring)
 * @param {string} text - Text content to analyze
 * @returns {Promise<object|null>} Analysis result or null
 * @example
 * const result = await tcpClient.checkForbiddenWords('This is spam');
 * // { success: true, text: '...', containsForbidden: true, matches: ['spam'], censored: '...' }
 */
const checkForbiddenWords = text => {
	if (!text || typeof text !== 'string') return Promise.resolve(null);
	return sendRequest(`forbidden_words:${encodeURIComponent(text)}`);
};

/**
 * Checks if password is in weak/common passwords list
 * @param {string} password - Password to check
 * @returns {Promise<object|null>} Check result or null
 * @example
 * const result = await tcpClient.checkWeakPassword('password123');
 * // { success: true, password: '...', weak: true }
 */
const checkWeakPassword = password => {
	if (!password || typeof password !== 'string') return Promise.resolve(null);
	return sendRequest(`weak_passwords:${encodeURIComponent(password.trim())}`);
};

/**
 * Classifies image for NSFW content using TensorFlow model
 * @param {string} imagePathOrUrl - Absolute path to image file or HTTPS URL
 * @returns {Promise<object|null>} Classification results or null
 * @example
 * // Local file
 * const result = await tcpClient.checkNSFW('C:\\images\\photo.jpg');
 * // Remote URL
 * const result = await tcpClient.checkNSFW('https://cdn.discordapp.com/avatars/123456789/abc123.png');
 * // { success: true, classifications: { porn: 12.34, sexy: 23.45, neutral: 50.12, hentai: 5.67, drawing: 8.42 }, nsfwScore: 41.46 }
 */
const checkNSFW = imagePathOrUrl => {
	if (!imagePathOrUrl || typeof imagePathOrUrl !== 'string') return Promise.resolve(null);
	return sendRequest(`nsfw:${encodeURIComponent(imagePathOrUrl.trim())}`);
};

/**
 * Extracts the dominant color and a color palette from an image using ColorThief
 * @param {string} imagePathOrUrl - Absolute path to image file or HTTPS URL
 * @returns {Promise<object|null>} Color extraction result or null
 * @example
 * // Local file
 * const result = await tcpClient.getDominantColors('C:\\images\\photo.jpg');
 * // Remote URL
 * const result = await tcpClient.getDominantColors('https://cdn.discordapp.com/avatars/123456789/abc123.png');
 * // { success: true, dominant: '#3b5d8f', colors: ['#3b5d8f', '#1a1a2e', '#e8c547', ...] }
 */
const getDominantColors = imagePathOrUrl => {
	if (!imagePathOrUrl || typeof imagePathOrUrl !== 'string') return Promise.resolve(null);
	return sendRequest(`colors:${encodeURIComponent(imagePathOrUrl.trim())}`);
};

/**
 * Checks if IP address belongs to VPN, proxy, Tor, or malicious lists
 * @param {string} ip - IP address to check
 * @returns {Promise<object|null>} Check result or null
 * @example
 * const result = await tcpClient.ipCheck('1.2.3.4');
 * // { success: true, ip: '1.2.3.4', vpn: false, tor: false, proxy: true, malicious: false, lists: ['http-proxy_output.txt'] }
 */
const ipCheck = ip => {
	if (!ip || !isIP(ip)) return Promise.resolve(null);
	return sendRequest(`ip_check:${encodeURIComponent(ip)}`);
};

/**
 * Retrieves the full list of countries (ISO 3166-1 alpha-2 code, name, flag emoji)
 * @returns {Promise<object|null>} Countries list or null
 * @example
 * const result = await tcpClient.geoCountries();
 * // { success: true, countries: [{ iso2: 'PL', name: 'Poland', emoji: '🇵🇱' }, ...] }
 */
const geoCountries = () => sendRequest(`geo_places:${encodeURIComponent(JSON.stringify({ op: 'countries' }))}`);

/**
 * Retrieves the states/provinces/voivodeships for a given country
 * @param {string} country - ISO 3166-1 alpha-2 country code (e.g. 'PL')
 * @returns {Promise<object|null>} States list or null
 * @example
 * const result = await tcpClient.geoStates('PL');
 * // { success: true, states: [{ id: 3901, name: 'Silesian Voivodeship' }, ...] }
 */
const geoStates = country => {
	if (!country || typeof country !== 'string') return Promise.resolve(null);
	return sendRequest(`geo_places:${encodeURIComponent(JSON.stringify({ op: 'states', country: country.trim() }))}`);
};

/**
 * Searches cities/towns/villages by name, optionally scoped to a country and state
 * @param {string} country - ISO 3166-1 alpha-2 country code (e.g. 'PL')
 * @param {string} [state] - State id returned by geoStates(), or omitted to search the whole country
 * @param {string} query - Search text (minimum 2 characters)
 * @returns {Promise<object|null>} Matching city names or null
 * @example
 * const result = await tcpClient.geoCities('PL', '3901', 'kat');
 * // { success: true, cities: ['Katowice'] }
 */
const geoCities = (country, state, query) => {
	if (!country || typeof country !== 'string') return Promise.resolve(null);
	if (!query || typeof query !== 'string') return Promise.resolve(null);
	return sendRequest(`geo_places:${encodeURIComponent(JSON.stringify({ op: 'cities', country: country.trim(), state: state || '', q: query.trim() }))}`);
};

/**
 * Retrieves current server statistics
 * @returns {Promise<object|null>} Server stats or null
 * @example
 * const stats = await tcpClient.getStats();
 * // {
 * //   success: true, status: 'ok',
 * //   connections: { active: 2, total: 10 },
 * //   cacheSize: { geoIp: 450, nsfw: 0, colors: 0, ipCheck: 120, goodBot: 30 },
 * //   blacklist: 1250, goodBots: 89, forbiddenWords: 342, weakPasswords: 50000, ipLists: 15000,
 * //   startedAt: '2026-05-22T04:00:00.000Z', uptime: 3600,
 * //   requests: { global: { requests: 0, successes: 0, errors: 0 }, byCategory: { geo_check: {...}, ... } }
 * // }
 */
const getStats = () => sendRequest('stats:');

/**
 * Checks if the TCP client is currently connected to the server
 * @returns {boolean} Connection status
 */
const isClientConnected = () => isConnected;

module.exports = {
	geoCheck,
	checkTempEmail,
	checkGoodBot,
	checkForbiddenWords,
	checkWeakPassword,
	ipCheck,
	checkNSFW,
	getDominantColors,
	geoCountries,
	geoStates,
	geoCities,
	getStats,
	isClientConnected,
};
