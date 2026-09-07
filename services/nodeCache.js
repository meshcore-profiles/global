const { RESP_TYPES } = require('redis');
const { unpack } = require('msgpackr');
const RedisClient = require('./redis.js');
const { REDIS_KEYS, computeStats } = require('../utils/nodeStats.js');

const typedRedisClient = RedisClient.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer });
const warsawDateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' });
const formatWarsawDate = date => warsawDateFormatter.format(date);

const statsCache = { all: null, pl: null };

const getCachedNodes = (region = 'pl') => {
	const key = REDIS_KEYS[region] ? region : 'pl';
	return typedRedisClient.get(REDIS_KEYS[key]);
};

const getLastRefreshedAt = async () => {
	const value = await RedisClient.get(REDIS_KEYS.updatedAt);
	return value ? new Date(value) : null;
};

const ensureStatsComputed = async (region, lastRefreshedAt) => {
	const cached = statsCache[region];
	if (cached && cached.refreshedAtMs === (lastRefreshedAt ? lastRefreshedAt.getTime() : null)) return cached.stats;

	const buffer = await getCachedNodes(region);
	if (!buffer) return null;

	const stats = computeStats(unpack(buffer));
	statsCache[region] = { refreshedAtMs: lastRefreshedAt ? lastRefreshedAt.getTime() : null, stats };
	return stats;
};

const getStats = async (region = 'pl') => {
	const lastRefreshedAt = await getLastRefreshedAt();
	const computed = await ensureStatsComputed(region, lastRefreshedAt);
	if (!computed) return null;

	return { ...computed, lastRefreshedAt: lastRefreshedAt ? lastRefreshedAt.toISOString() : null };
};

module.exports = { getCachedNodes, getLastRefreshedAt, getStats, formatWarsawDate };
